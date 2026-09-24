import { JDParserService, JdExtractionResult } from './JDParserService';
import { CrawlerService, CrawledPage } from './CrawlerService';
import { InterviewResearchService, ProcessExtractionResult } from './InterviewResearchService';
import { LLMService } from './LLMService';

export interface ResearchResult {
  jdExtraction: JdExtractionResult & { requirements: any[] };
  companyPages: CrawledPage[];
  interviewProcess: ProcessExtractionResult;
  pagesUsed: string[];
}

export class ResearchPipeline {
  private jdParser: JDParserService;
  private crawler: CrawlerService;
  private interviewResearch: InterviewResearchService;

  constructor() {
    const llmService = new LLMService();
    this.jdParser = new JDParserService(llmService);
    this.crawler = new CrawlerService();
    this.interviewResearch = new InterviewResearchService(llmService);
  }

  async run(jdText: string, companyUrl: string): Promise<ResearchResult> {
    console.log(`Starting research for ${companyUrl}...`);
    
    // 1. Parse JD
    console.log('Parsing Job Description...');
    const jdExtraction = await this.jdParser.parseJobDescription(jdText);

    const pagesUsed: string[] = [];
    const companyPages: CrawledPage[] = [];

    // 2. Crawl Company Homepage
    console.log('Crawling homepage...');
    const homepage = await this.crawler.fetchPage(companyUrl);
    
    let companyName = new URL(companyUrl).hostname.replace('www.', '').split('.')[0];
    
    if (homepage) {
      pagesUsed.push(homepage.url);
      companyPages.push(homepage);
      
      // 3. Rank links and find about/careers
      const rankedLinks = this.crawler.rankLinks(homepage.links, companyUrl);
      const topLinksToFetch = rankedLinks.slice(0, 2); // Fetch top 2 most promising links

      console.log(`Found promising links: ${topLinksToFetch.join(', ')}`);

      for (const link of topLinksToFetch) {
        const page = await this.crawler.fetchPage(link);
        if (page) {
          pagesUsed.push(page.url);
          companyPages.push(page);
        }
      }
    } else {
      console.warn('Could not retrieve company homepage. Will rely on JD and public knowledge.');
    }

    // 4. Public Interview Research
    console.log('Researching public interview process...');
    const interviewProcess = await this.interviewResearch.researchInterviewProcess(companyName);

    console.log('Research complete.');
    return {
      jdExtraction,
      companyPages,
      interviewProcess,
      pagesUsed
    };
  }
}
