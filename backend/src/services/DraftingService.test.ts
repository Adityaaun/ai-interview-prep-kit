import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftingService } from './DraftingService';
import { LLMService } from './LLMService';

vi.mock('./LLMService');

describe('DraftingService', () => {
  let draftingService: DraftingService;
  let mockLlmService: vi.Mocked<LLMService>;

  beforeEach(() => {
    mockLlmService = new LLMService() as vi.Mocked<LLMService>;
    draftingService = new DraftingService(mockLlmService);
    vi.resetAllMocks();
  });

  it('should generate questions with stable IDs', async () => {
    const reqs = [{ id: 'req_123', text: 'React', kind: 'technical', priority: 'must' }];
    
    mockLlmService.generateStructured.mockResolvedValue([
      { requirement_ids: ['req_123'], prompt: 'Q1', answer_outline: 'A1', difficulty: 2 }
    ]);

    const result = await draftingService.generateQuestions('technical', reqs, 'Context');

    expect(result.length).toBe(1);
    expect(result[0].id).toMatch(/^q_[0-9a-f]{8}$/);
    expect(result[0].category).toBe('technical');
    expect(result[0].requirement_ids).toContain('req_123');
  });

  it('should generate flashcards with stable IDs', async () => {
    const reqs = [{ id: 'req_123', text: 'React', kind: 'technical', priority: 'must' }];
    
    mockLlmService.generateStructured.mockResolvedValue([
      { requirement_ids: ['req_123'], front: 'F1', back: 'B1' }
    ]);

    const result = await draftingService.generateFlashcards(reqs, 'Context');

    expect(result.length).toBe(1);
    expect(result[0].id).toMatch(/^f_[0-9a-f]{8}$/);
    expect(result[0].front).toBe('F1');
    expect(result[0].requirement_ids).toContain('req_123');
  });
});
