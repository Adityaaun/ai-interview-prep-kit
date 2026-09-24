import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewResearchService } from './InterviewResearchService';
import { LLMService } from './LLMService';
import axios from 'axios';

vi.mock('axios');
vi.mock('./LLMService');

describe('InterviewResearchService', () => {
  let service: InterviewResearchService;
  let mockLLM: vi.Mocked<LLMService>;

  beforeEach(() => {
    mockLLM = new LLMService() as vi.Mocked<LLMService>;
    service = new InterviewResearchService(mockLLM);
    vi.resetAllMocks();
  });

  it('should use public evidence when available', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: '<html><body><div class="result__snippet">They do a phone screen and a system design round.</div></body></html>'
    });
    mockLLM.generateStructured.mockResolvedValue({
      hasPublicDiscussion: true,
      summary: 'Phone screen and system design.',
      identifiedStages: ['Phone Screen', 'System Design'],
      commonTopics: []
    });

    const result = await service.researchInterviewProcess('TestCo');
    
    expect(result.hasPublicDiscussion).toBe(true);
    expect(result.identifiedStages.length).toBe(2);
    expect(mockLLM.generateStructured).toHaveBeenCalled();
  });

  it('should not fallback to LLM parametric knowledge when no snippets are found', async () => {
    // Simulating no snippets found
    vi.mocked(axios.get).mockResolvedValue({
      data: '<html><body></body></html>'
    });

    const result = await service.researchInterviewProcess('UnknownCo');
    
    // The LLM should be bypassed entirely
    expect(mockLLM.generateStructured).not.toHaveBeenCalled();
    expect(result.hasPublicDiscussion).toBe(false);
    expect(result.identifiedStages.length).toBe(0);
  });

  it('should handle search timeout/failure gracefully by falling back to empty state', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Timeout'));

    const result = await service.researchInterviewProcess('TimeoutCo');
    
    expect(mockLLM.generateStructured).not.toHaveBeenCalled();
    expect(result.hasPublicDiscussion).toBe(false);
    expect(result.summary).toContain('No public interview process discussion found');
  });
});
