import { LLMService } from './LLMService';
import { CompanyBriefSchema, QuestionsArraySchema, FlashcardsArraySchema } from '../schemas/kitSchema';
import crypto from 'crypto';

export class DraftingService {
  constructor(private llmService: LLMService) {}

  async generateCompanyBrief(companyDataText: string): Promise<any> {
    const prompt = `
      Based on the following scraped text about a company, generate a brief company overview.
      Provide a summary, what they do, and list the URLs used (if mentioned in text).
      
      You MUST return ONLY a JSON object matching this exact structure, with no markdown formatting:
      {
        "summary": "string",
        "what_they_do": "string",
        "sources": ["string"]
      }

      Company Text:
      """
      ${companyDataText}
      """
    `;
    return this.llmService.generateStructured(prompt, CompanyBriefSchema);
  }

  async generateQuestions(
    category: 'technical' | 'behavioural' | 'system-design' | 'company-fit',
    requirements: any[],
    contextText: string
  ): Promise<any[]> {
    if (requirements.length === 0) return [];
    
    const reqText = JSON.stringify(requirements, null, 2);
    const prompt = `
      You are an expert technical interviewer. Generate a list of ${category} interview questions.
      You MUST cover the provided requirements. Reference their exact IDs in the 'requirement_ids' array.
      Do not invent new requirements.
      Difficulty should be an integer from 1 to 3.
      
      You MUST return ONLY a JSON array of objects matching this exact structure, with no markdown formatting:
      [
        {
          "requirement_ids": ["string"],
          "category": "technical" | "behavioural" | "system-design" | "company-fit",
          "prompt": "string",
          "answer_outline": "string",
          "difficulty": number
        }
      ]
      
      Context (Job & Interview Process):
      ${contextText}

      Requirements to cover:
      ${reqText}
    `;

    const questions = await this.llmService.generateStructured(prompt, QuestionsArraySchema);
    
    // Assign stable IDs
    return questions.map(q => ({
      ...q,
      category,
      id: `q_${crypto.randomBytes(4).toString('hex')}`
    }));
  }

  async generateFlashcards(requirements: any[], contextText: string): Promise<any[]> {
    if (requirements.length === 0) return [];
    
    const reqText = JSON.stringify(requirements, null, 2);
    const prompt = `
      You are an expert technical interviewer helping a candidate prepare.
      Generate quick flashcards (front/back) to test the candidate on actual technical or behavioral concepts related to the requirements.
      Do NOT just ask them to memorize the job description (e.g., do NOT ask "how many years of experience are needed?").
      Instead, ask real interview prep questions (e.g., "What are React Hooks?", "Explain row-level security in PostgreSQL", "Name a time you resolved a conflict").
      Reference the exact requirement IDs in the 'requirement_ids' array.
      
      You MUST return ONLY a JSON array of objects matching this exact structure, with no markdown formatting:
      [
        {
          "requirement_ids": ["string"],
          "front": "string",
          "back": "string"
        }
      ]
      
      Context:
      ${contextText}

      Requirements:
      ${reqText}
    `;

    const cards = await this.llmService.generateStructured(prompt, FlashcardsArraySchema);
    
    return cards.map(c => ({
      ...c,
      id: `f_${crypto.randomBytes(4).toString('hex')}`
    }));
  }
}
