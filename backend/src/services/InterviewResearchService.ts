import axios from 'axios';
import * as cheerio from 'cheerio';
import { LLMService } from './LLMService';
import { z } from 'zod';

export const ProcessExtractionSchema = z.object({
  hasPublicDiscussion: z.boolean(),
  summary: z.string(),
  identifiedStages: z.array(z.string()),
  commonTopics: z.array(z.string())
});

export type ProcessExtractionResult = z.infer<typeof ProcessExtractionSchema>;

export class InterviewResearchService {
  constructor(private llmService: LLMService) {}

  /**
   * Attempts to find public discussion about the company's interview process.
   * Without a dedicated search API (like SERP API), we'll do a simple HTML scrape 
   * of a privacy-friendly search engine (e.g., DuckDuckGo) or rely on direct queries.
   */
  async researchInterviewProcess(companyName: string): Promise<ProcessExtractionResult> {
    const query = `${companyName} software engineer interview process reddit glassdoor`;
    let scrapedText = '';

    try {
      // Simulating a search query fetch. 
      // Note: In a real system, you'd use a Search API (Google Custom Search, Exa, Tavily).
      // For this assessment, we'll try a basic DDG html fetch, and if it fails, fallback to LLM knowledge.
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      scrapedText = $('.result__snippet').text().replace(/\s+/g, ' ').trim();
    } catch (e: any) {
      console.warn(`Failed to retrieve public discussion for ${companyName}:`, e.message);
      // We record the failure and short-circuit below to avoid hallucination.
    }

    if (!scrapedText) {
      return {
        hasPublicDiscussion: false,
        summary: "No public interview process discussion found.",
        identifiedStages: [],
        commonTopics: []
      };
    }

    const prompt = `
      You are an expert technical recruiter. Analyze the following search snippets regarding the interview process for ${companyName}.
      
      CRITICAL INSTRUCTION: You MUST NOT fabricate, invent, or use your general knowledge about ${companyName}'s interview process. 
      If the provided snippets do not contain usable information about the interview process, you must set "hasPublicDiscussion" to false, and leave "summary", "identifiedStages", and "commonTopics" empty.
      
      Extract whether public discussion exists, a brief summary of the process, the typical stages (e.g., 'Take-home', 'System Design'), and common topics.

      You MUST return ONLY a JSON object matching this exact structure, with no markdown formatting:
      {
        "hasPublicDiscussion": boolean,
        "summary": "string",
        "identifiedStages": ["string"],
        "commonTopics": ["string"]
      }

      Search Snippets:
      """
      ${scrapedText}
      """
    `;

    return await this.llmService.generateStructured(prompt, ProcessExtractionSchema);
  }
}
