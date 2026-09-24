import { LLMService } from './LLMService';
import { ResearchPipeline } from './ResearchPipeline';
import { DraftingService } from './DraftingService';
import { CoverageService } from './CoverageService';
import { ScheduleService } from './ScheduleService';
import { AppendixASchema } from '../schemas/kitSchema';
import { Kit } from '../models/Kit';

export class KitGenerator {
  static async generateKitData(jd: string, company_url: string, days: number, userId?: string) {
    const llmService = new LLMService();
    const researchPipeline = new ResearchPipeline();
    const draftingService = new DraftingService(llmService);
    const coverageService = new CoverageService(draftingService);
    const scheduleService = new ScheduleService();

    // 1. Research
    const research = await researchPipeline.run(jd, company_url);
    const reqs = research.jdExtraction.requirements;
    const contextText = `Company Info: ${research.companyPages.map(p => p.textContent).join('\n')}\nInterview Process: ${research.interviewProcess.summary}`;

    // 2. Draft
    const company_brief = await draftingService.generateCompanyBrief(contextText);
    const role = {
      title: research.jdExtraction.title,
      seniority: research.jdExtraction.seniority,
      responsibilities: research.jdExtraction.responsibilities,
      requirements: reqs.map(r => ({ ...r, origin: 'GENERATED' }))
    };

    const baseQuestionsPromises = [
      draftingService.generateQuestions('technical', reqs.filter(r => r.kind === 'technical' || r.kind === 'domain'), contextText),
      draftingService.generateQuestions('behavioural', reqs.filter(r => r.kind === 'behavioural'), contextText)
    ];

    const [techQuestions, behavQuestions] = await Promise.all(baseQuestionsPromises);
    let initialQuestions = [...techQuestions, ...behavQuestions];

    const flashcards = await draftingService.generateFlashcards(reqs, contextText);

    // 3. Coverage
    const coverageResult = await coverageService.ensureCoverage(reqs, initialQuestions, contextText, 2);

    // 4. Schedule
    const schedule = scheduleService.allocateSchedule(coverageResult.finalQuestions, reqs, days);

    const kitData = {
      source: {
        company: new URL(company_url).hostname,
        company_url,
        role: role.title,
        location: "Remote",
        jd_chars: jd.length,
        researched_at: new Date().toISOString(),
        pages_used: research.pagesUsed,
        contextText
      },
      company_brief,
      role,
      questions: coverageResult.finalQuestions.map(q => ({ ...q, origin: 'GENERATED' })),
      flashcards: flashcards.map(f => ({ ...f, origin: 'GENERATED' })),
      schedule,
      coverage: {
        uncovered_requirement_ids: coverageResult.uncoveredIds,
        passes: coverageResult.passes
      }
    };

    const validatedKit = AppendixASchema.parse(kitData);

    if (userId) {
      const kit = await Kit.create({
        ...validatedKit,
        userId,
        status: 'COMPLETED'
      });
      return { id: kit._id, status: kit.status, kit: validatedKit };
    }

    return { id: null, status: 'ok', kit: validatedKit };
  }
}
