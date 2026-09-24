import { DraftingService } from './DraftingService';

export class CoverageService {
  constructor(private draftingService: DraftingService) {}

  /**
   * Deterministically calculates uncovered must-have requirements.
   * Coverage rule: every must-have requirement must be covered by at least one question.
   */
  calculateUncoveredRequirements(requirements: any[], questions: any[]): string[] {
    const mustHaveIds = requirements
      .filter(r => r.priority === 'must')
      .map(r => r.id);

    const coveredIds = new Set<string>();
    for (const q of questions) {
      if (Array.isArray(q.requirement_ids)) {
        for (const id of q.requirement_ids) {
          coveredIds.add(id);
        }
      }
    }

    return mustHaveIds.filter(id => !coveredIds.has(id));
  }

  /**
   * Runs the coverage loop up to maxPasses.
   */
  async ensureCoverage(
    requirements: any[], 
    initialQuestions: any[], 
    contextText: string,
    maxPasses: number = 2
  ): Promise<{ finalQuestions: any[], uncoveredIds: string[], passes: number }> {
    let currentQuestions = [...initialQuestions];
    let passes = 1;
    let uncoveredIds = this.calculateUncoveredRequirements(requirements, currentQuestions);

    while (uncoveredIds.length > 0 && passes < maxPasses) {
      passes++;
      
      const uncoveredReqs = requirements.filter(r => uncoveredIds.includes(r.id));
      
      // Group by kind to generate category-specific questions
      const techReqs = uncoveredReqs.filter(r => r.kind === 'technical' || r.kind === 'domain');
      const behavReqs = uncoveredReqs.filter(r => r.kind === 'behavioural');
      
      console.log(`Coverage Pass ${passes}: Missing ${uncoveredIds.length} requirements. Generating gap fillers...`);
      
      const newQuestionsPromises = [];
      if (techReqs.length > 0) {
        newQuestionsPromises.push(this.draftingService.generateQuestions('technical', techReqs, contextText));
      }
      if (behavReqs.length > 0) {
        newQuestionsPromises.push(this.draftingService.generateQuestions('behavioural', behavReqs, contextText));
      }
      
      const newQuestionsArrays = await Promise.all(newQuestionsPromises);
      const newQuestions = newQuestionsArrays.flat();
      
      currentQuestions = currentQuestions.concat(newQuestions);
      uncoveredIds = this.calculateUncoveredRequirements(requirements, currentQuestions);
    }

    if (uncoveredIds.length > 0) {
      console.warn(`COVERAGE_INCOMPLETE: Failed to cover must-have requirements: ${uncoveredIds.join(', ')}`);
    }

    return {
      finalQuestions: currentQuestions,
      uncoveredIds,
      passes
    };
  }
}
