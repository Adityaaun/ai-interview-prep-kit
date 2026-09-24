import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { validateUrlSSRF } from '../utils/security';

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

export interface CrawledPage {
  url: string;
  title: string;
  textContent: string;
  links: string[];
}

export class CrawlerService {
  private userAgent = 'TraoBot/1.0';

  async isAllowedByRobotsTxt(targetUrl: string): Promise<boolean> {
    try {
      const parsedUrl = new URL(targetUrl);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
      
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        maxContentLength: 500 * 1024, // 500KB for robots.txt
        validateStatus: () => true // resolve on any status
      });

      if (response.status >= 200 && response.status < 300) {
        const robots = robotsParser(robotsUrl, response.data);
        const isAllowed = robots.isAllowed(targetUrl, this.userAgent);
        return isAllowed !== false; // If undefined, assume allowed
      }
      return true; // No robots.txt or invalid, default to allowed
    } catch (e) {
      return true; // Fail open for robots.txt
    }
  }

  async fetchPage(targetUrl: string): Promise<CrawledPage | null> {
    const isSafe = await validateUrlSSRF(targetUrl);
    if (!isSafe) {
      console.warn(`SSRF Validation failed or unresolvable for: ${targetUrl}`);
      return null;
    }

    const isAllowed = await this.isAllowedByRobotsTxt(targetUrl);
    if (!isAllowed) {
      console.warn(`Blocked by robots.txt: ${targetUrl}`);
      return null;
    }

    try {
      const response = await axios.get(targetUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000, // 10 seconds max
        maxContentLength: MAX_RESPONSE_SIZE,
        responseType: 'text'
      });

      const contentType = (response.headers['content-type'] as string) || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        console.warn(`Unsupported content type: ${contentType} for ${targetUrl}`);
        return null;
      }

      const $ = cheerio.load(response.data);
      
      // Remove scripts, styles, noscript, etc.
      $('script, style, noscript, iframe, svg, img, video, audio').remove();

      const title = $('title').text().trim() || '';
      let textContent = $('body').text().replace(/\s+/g, ' ').trim();
      
      // Truncate to prevent hitting strict TPM limits on free tier LLMs (like Groq)
      if (textContent.length > 6000) {
        textContent = textContent.slice(0, 6000) + '...';
      }

      const links: string[] = [];
      const parsedUrl = new URL(targetUrl);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            // Resolve relative URLs
            const resolvedUrl = new URL(href, targetUrl);
            // Only keep http/https and same-origin or known links?
            // Let's keep all http/https links
            if (resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:') {
              // Normalize hash out
              resolvedUrl.hash = '';
              const cleanUrl = resolvedUrl.toString();
              if (!links.includes(cleanUrl)) {
                links.push(cleanUrl);
              }
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      });

      return {
        url: targetUrl,
        title,
        textContent,
        links
      };
    } catch (error: any) {
      console.error(`Failed to fetch ${targetUrl}:`, error.message);
      return null;
    }
  }

  rankLinks(links: string[], baseUrl: string): string[] {
    const parsedBase = new URL(baseUrl);
    const host = parsedBase.host;

    const scoringRules = [
      { regex: /\/careers?/i, score: 50 },
      { regex: /\/jobs?/i, score: 50 },
      { regex: /\/about(-us)?/i, score: 40 },
      { regex: /\/company/i, score: 30 },
      { regex: /\/team/i, score: 20 },
      { regex: /engineering/i, score: 20 },
      { regex: /blog/i, score: 10 }
    ];

    const ranked = links.map(link => {
      let score = 0;
      try {
        const parsedLink = new URL(link);
        
        // Penalize off-site links heavily unless they are known job boards (ATS)
        if (parsedLink.host !== host) {
          const atsDomains = ['greenhouse.io', 'lever.co', 'workable.com', 'breezy.hr'];
          const isAts = atsDomains.some(d => parsedLink.host.includes(d));
          if (isAts) {
            score += 30; // High value if it points to an ATS
          } else {
            score -= 100; // Likely external noise
          }
        }

        const path = parsedLink.pathname;
        for (const rule of scoringRules) {
          if (rule.regex.test(path)) {
            score += rule.score;
          }
        }

        // Shorter paths might be better root pages
        score -= (path.split('/').length * 2);

      } catch (e) {
        score = -1000;
      }
      return { link, score };
    });

    // Sort descending by score, filter out negative scores
    return ranked
      .filter(l => l.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(l => l.link);
  }
}
