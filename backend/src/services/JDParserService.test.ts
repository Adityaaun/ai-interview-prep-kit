import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JDParserService } from './JDParserService';
import { LLMService } from './LLMService';

vi.mock('./LLMService');

describe('JDParserService', () => {
  let jdParser: JDParserService;
  let mockLlmService: vi.Mocked<LLMService>;

  beforeEach(() => {
    mockLlmService = new LLMService() as vi.Mocked<LLMService>;
    jdParser = new JDParserService(mockLlmService);
    vi.resetAllMocks();
  });

  it('should parse JD and assign stable IDs to requirements', async () => {
    mockLlmService.generateStructured.mockResolvedValue({
      title: 'Senior Engineer',
      seniority: 'Senior',
      responsibilities: ['Write code'],
      requirements: [
        { text: '5+ years React', kind: 'technical', priority: 'must' },
        { text: 'Good communication', kind: 'behavioural', priority: 'nice' }
      ]
    });

    const result = await jdParser.parseJobDescription('Dummy JD');

    expect(result.title).toBe('Senior Engineer');
    expect(result.requirements.length).toBe(2);
    expect(result.requirements[0].id).toMatch(/^req_[0-9a-f]{8}$/);
    expect(result.requirements[1].id).toMatch(/^req_[0-9a-f]{8}$/);
    expect(result.requirements[0].text).toBe('5+ years React');
  });

  it('should handle thin JD', async () => {
    mockLlmService.generateStructured.mockResolvedValue({
      title: 'Unspecified',
      seniority: 'Unspecified',
      responsibilities: [],
      requirements: []
    });

    const result = await jdParser.parseJobDescription('Just a small startup.');
    expect(result.requirements.length).toBe(0);
  });
});
