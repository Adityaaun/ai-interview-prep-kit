import { z } from 'zod';
import { LLMService } from './LLMService';
import crypto from 'crypto';

export const JdExtractionSchema = z.object({
  title: z.string(),
  seniority: z.string().describe("e.g. Junior, Senior, Staff, Lead. Return 'Unspecified' if unknown."),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    kind: z.enum(['technical', 'behavioural', 'domain']),
    priority: z.enum(['must', 'nice'])
  }))
});

export type JdExtractionResult = z.infer<typeof JdExtractionSchema>;

export class JDParserService {
  constructor(private llmService: LLMService) {}

  async parseJobDescription(jdText: string): Promise<JdExtractionResult & { requirements: any[] }> {
    const prompt = `
      You are an expert technical recruiter. Analyze the following job description.
      Extract the job title, seniority level, key responsibilities, and specific requirements.
      For each requirement, classify its 'kind' as 'technical', 'behavioural', or 'domain'.
      Also classify its 'priority' as 'must' (required) or 'nice' (bonus/preferred).
      Do NOT invent or hallucinate requirements that are not in the text.
      If the text is extremely thin, return empty arrays.
      
      You MUST return ONLY a JSON object matching this exact structure, with no markdown formatting:
      {
        "title": "string",
        "seniority": "string",
        "responsibilities": ["string"],
        "requirements": [
          {
            "text": "string",
            "kind": "technical" | "behavioural" | "domain",
            "priority": "must" | "nice"
          }
        ]
      }
      
      Job Description:
      """
      ${jdText}
      """
    `;

    const extracted = await this.llmService.generateStructured(prompt, JdExtractionSchema);
    
    // Assign stable IDs to requirements
    const requirementsWithIds = extracted.requirements.map((req: any) => ({
      ...req,
      id: req.id || `req_${crypto.randomBytes(4).toString('hex')}`
    }));

    return {
      ...extracted,
      requirements: requirementsWithIds
    };
  }
}
