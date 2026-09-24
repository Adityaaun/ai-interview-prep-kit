import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchPipeline } from './ResearchPipeline';
import { CrawlerService } from './CrawlerService';

vi.mock('./JDParserService');
vi.mock('./InterviewResearchService');

describe('ResearchPipeline', () => {
  let pipeline: ResearchPipeline;

  beforeEach(() => {
    pipeline = new ResearchPipeline();
    vi.resetAllMocks();
  });

  it('should fetch second hop links', async () => {
    const fetchPageSpy = vi.spyOn(CrawlerService.prototype, 'fetchPage').mockImplementation(async (url) => {
      if (url === 'https://testco.com') {
        return { url, title: 'Home', textContent: 'Home', links: ['https://testco.com/about'] };
      }
      if (url === 'https://testco.com/about') {
        return { url, title: 'About', textContent: 'About', links: ['https://testco.com/careers'] };
      }
      if (url === 'https://testco.com/careers') {
        return { url, title: 'Careers', textContent: 'Careers', links: [] };
      }
      return null;
    });

    const rankLinksSpy = vi.spyOn(CrawlerService.prototype, 'rankLinks').mockImplementation((links) => links);

    // Mock other parts
    (pipeline as any).jdParser.parseJobDescription = vi.fn().mockResolvedValue({ requirements: [], title: 'Eng' });
    (pipeline as any).interviewResearch.researchInterviewProcess = vi.fn().mockResolvedValue({ hasPublicDiscussion: false });

    const result = await pipeline.run('JD text', 'https://testco.com');

    // 1 for home, 1 for first hop (about), 1 for second hop (careers)
    expect(fetchPageSpy).toHaveBeenCalledTimes(3);
    expect(result.pagesUsed).toContain('https://testco.com/careers');
  });
});
