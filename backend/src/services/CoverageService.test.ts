import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoverageService } from './CoverageService';
import { DraftingService } from './DraftingService';
import { LLMService } from './LLMService';

vi.mock('./DraftingService');

describe('CoverageService', () => {
  let coverageService: CoverageService;
  let mockDraftingService: vi.Mocked<DraftingService>;

  beforeEach(() => {
    // LLMService is not used directly in CoverageService, but DraftingService needs it
    const mockLlm = {} as LLMService;
    mockDraftingService = new DraftingService(mockLlm) as vi.Mocked<DraftingService>;
    coverageService = new CoverageService(mockDraftingService);
    vi.resetAllMocks();
  });

  it('should accurately calculate uncovered requirements', () => {
    const reqs = [
      { id: 'r1', priority: 'must' },
      { id: 'r2', priority: 'must' },
      { id: 'r3', priority: 'nice' }
    ];

    const questions = [
      { id: 'q1', requirement_ids: ['r1'] }
    ];

    const uncovered = coverageService.calculateUncoveredRequirements(reqs, questions);
    expect(uncovered).toContain('r2');
    expect(uncovered).not.toContain('r1');
    expect(uncovered).not.toContain('r3'); // nice-to-have is not required for coverage
  });

  it('should run second-pass generation for uncovered requirements', async () => {
    const reqs = [
      { id: 'r1', priority: 'must', kind: 'technical' },
      { id: 'r2', priority: 'must', kind: 'behavioural' }
    ];

    const initialQuestions = [
      { id: 'q1', requirement_ids: ['r1'] } // r2 is uncovered
    ];

    // Mock the second pass generation
    mockDraftingService.generateQuestions.mockResolvedValue([
      { id: 'q2', requirement_ids: ['r2'], category: 'behavioural' }
    ]);

    const result = await coverageService.ensureCoverage(reqs, initialQuestions, 'Context');

    expect(result.passes).toBe(2);
    expect(result.uncoveredIds.length).toBe(0);
    expect(result.finalQuestions.length).toBe(2);
    expect(result.finalQuestions[1].id).toBe('q2');
    
    // Ensure drafting service was called with the uncovered behavioural req
    expect(mockDraftingService.generateQuestions).toHaveBeenCalledWith(
      'behavioural', 
      [reqs[1]], 
      'Context'
    );
  });

  it('should return with uncovered requirements instead of throwing after 2 passes', async () => {
    const reqs = [
      { id: 'r1', priority: 'must', kind: 'technical' }
    ];

    const initialQuestions: any[] = [];

    // Mock the second pass generation to ALSO fail to cover r1
    mockDraftingService.generateQuestions.mockResolvedValue([]);

    const result = await coverageService.ensureCoverage(reqs, initialQuestions, 'Context');
    expect(result.uncoveredIds).toContain('r1');
    expect(result.passes).toBe(2);
  });

  it('should succeed if only nice-to-have requirements remain uncovered', async () => {
    const reqs = [
      { id: 'r1', priority: 'nice', kind: 'technical' }
    ];

    const initialQuestions: any[] = [];

    // Mock the second pass generation
    mockDraftingService.generateQuestions.mockResolvedValue([]);

    const result = await coverageService.ensureCoverage(reqs, initialQuestions, 'Context');
    expect(result.passes).toBe(1); // Because it doesn't even loop if no must-haves are uncovered
    expect(result.uncoveredIds.length).toBe(0); // Nice-to-haves don't count towards uncoveredIds
  });
});
