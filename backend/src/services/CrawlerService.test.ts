import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlerService } from './CrawlerService';
import axios from 'axios';
import { validateUrlSSRF } from '../utils/security';

vi.mock('axios');

describe('CrawlerService', () => {
  let crawler: CrawlerService;

  beforeEach(() => {
    crawler = new CrawlerService();
    vi.resetAllMocks();
  });

  it('should fetch a valid page and extract text and links', async () => {
    vi.mocked(axios.get).mockImplementation(async (url) => {
      if (url.includes('robots.txt')) {
        return { status: 404, data: '' };
      }
      return {
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: '<html><head><title>Test Co</title></head><body><h1>Welcome</h1> <a href="/careers">Careers</a> <a href="https://other.com">Other</a></body></html>'
      };
    });

    const result = await crawler.fetchPage('https://testco.com');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test Co');
    expect(result?.textContent).toBe('Welcome Careers Other');
    expect(result?.links).toContain('https://testco.com/careers');
    expect(result?.links).toContain('https://other.com/');
  });

  it('should return null for unreachable company', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));
    const result = await crawler.fetchPage('https://unreachable.com');
    expect(result).toBeNull();
  });

  it('should return null for blocked by robots.txt', async () => {
    vi.mocked(axios.get).mockImplementation(async (url) => {
      if (url.includes('robots.txt')) {
        return { status: 200, data: 'User-agent: *\nDisallow: /' };
      }
      return { status: 200, headers: { 'content-type': 'text/html' }, data: '<html></html>' };
    });

    const result = await crawler.fetchPage('https://blocked.com/careers');
    expect(result).toBeNull();
  });

  it('should handle duplicate and relative links', async () => {
    vi.mocked(axios.get).mockImplementation(async (url) => {
      if (url.includes('robots.txt')) return { status: 404, data: '' };
      return {
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: '<a href="/about">About</a><a href="/about#team">About</a><a href="https://dup.com/about">About</a>'
      };
    });

    const result = await crawler.fetchPage('https://dup.com');
    expect(result?.links.length).toBe(1);
    expect(result?.links[0]).toBe('https://dup.com/about');
  });

  it('should rank hiring and about pages higher', () => {
    const links = [
      'https://test.com/blog/article1',
      'https://test.com/careers',
      'https://test.com/about-us',
      'https://test.com/privacy',
      'https://external.com/noise'
    ];
    const ranked = crawler.rankLinks(links, 'https://test.com');
    expect(ranked[0]).toBe('https://test.com/careers');
    expect(ranked[1]).toBe('https://test.com/about-us');
    expect(ranked).not.toContain('https://external.com/noise');
  });
});

describe('Security SSRF Utils', () => {
  it('should reject invalid URLs', async () => {
    const isSafe = await validateUrlSSRF('not-a-url');
    expect(isSafe).toBe(false);
  });

  it('should reject ftp or file protocols', async () => {
    const isSafe = await validateUrlSSRF('ftp://10.0.0.1/file');
    expect(isSafe).toBe(false);
  });
});
