import { describe, it, expect } from 'vitest';
import { BuilderService } from './BuilderService';

describe('BuilderService', () => {
  const builderService = new BuilderService();

  const existingQuestions = [
    { id: 'q1', category: 'technical', prompt: 'Gen Q1', origin: 'GENERATED' },
    { id: 'q2', category: 'technical', prompt: 'Edited Q2', origin: 'EDITED' },
    { id: 'q3', category: 'technical', prompt: 'User Q3', origin: 'USER_CREATED' },
    { id: 'q4', category: 'behavioural', prompt: 'Gen Beh Q4', origin: 'GENERATED' }
  ];

  it('should preserve edited and user-created questions upon regeneration of their category', () => {
    const newGeneratedTechnical = [
      { id: 'q5', category: 'technical', prompt: 'New Gen Q5' },
      { id: 'q6', category: 'technical', prompt: 'New Gen Q6' }
    ];

    // Regenerating 'technical' category
    const merged = builderService.mergeSection(existingQuestions, newGeneratedTechnical, 'technical');

    // Expected outcome:
    // 1. 'q4' (behavioural) survives untouched because it's a different category
    // 2. 'q1' (technical, GENERATED) is discarded
    // 3. 'q2' (technical, EDITED) survives
    // 4. 'q3' (technical, USER_CREATED) survives
    // 5. 'q5', 'q6' (technical, new GENERATED) are added

    expect(merged.length).toBe(5);
    
    const ids = merged.map(q => q.id);
    expect(ids).not.toContain('q1'); // discarded
    expect(ids).toContain('q2'); // edited preserved
    expect(ids).toContain('q3'); // user-created preserved
    expect(ids).toContain('q4'); // other category preserved
    expect(ids).toContain('q5'); // new
    expect(ids).toContain('q6'); // new

    // Check origins
    const q5 = merged.find(q => q.id === 'q5');
    expect(q5?.origin).toBe('GENERATED'); // correctly marked
  });

  it('should discard all GENERATED questions if no category is specified (global regenerate)', () => {
    const newGeneratedAll = [
      { id: 'q5', category: 'technical', prompt: 'New Gen Q5' }
    ];

    const merged = builderService.mergeSection(existingQuestions, newGeneratedAll);
    
    expect(merged.length).toBe(3); // q2, q3, plus new q5
    
    const ids = merged.map(q => q.id);
    expect(ids).not.toContain('q1'); // discarded
    expect(ids).not.toContain('q4'); // discarded (global regenerate)
    expect(ids).toContain('q2'); // preserved
    expect(ids).toContain('q3'); // preserved
    expect(ids).toContain('q5'); // new
  });
});
