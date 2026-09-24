import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import { z } from 'zod';

class AsyncSemaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.permits++;
    }
  }
}

const LLM_MAX_CONCURRENCY = parseInt(process.env.LLM_MAX_CONCURRENCY || '2', 10);
const globalSemaphore = new AsyncSemaphore(LLM_MAX_CONCURRENCY);

export class LLMService {
  private genAI?: GoogleGenerativeAI;
  private geminiModel?: GenerativeModel;
  private groqClient?: OpenAI;
  private groqModel: string = 'openai/gpt-oss-120b';

  constructor() {
    if (process.env.GROQ_API_KEY) {
      console.log('Initializing LLMService with Groq API');
      this.groqClient = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      });
      if (process.env.GROQ_MODEL) {
        this.groqModel = process.env.GROQ_MODEL;
      }
    } else {
      console.log('Initializing LLMService with Gemini API');
      const apiKey = process.env.GEMINI_API_KEY || 'dummy';
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a structured JSON response enforcing the provided Zod schema.
   * Includes exponential backoff for rate limits, jitter, and global concurrency limits.
   */
  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    retries = 8
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await globalSemaphore.acquire();
        let responseText = '';
        try {
          if (this.groqClient) {
            const completion = await this.groqClient.chat.completions.create({
              model: this.groqModel,
              messages: [{ role: 'user', content: prompt + '\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. Do not include markdown code blocks or any extra text.' }],
              response_format: { type: 'json_object' }
            });
            responseText = completion.choices[0]?.message?.content || '';
          } else if (this.geminiModel) {
            const result = await this.geminiModel.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              }
            });
            responseText = result.response.text();
          } else {
            throw new Error('No LLM client initialized');
          }
        } finally {
          globalSemaphore.release();
        }
        // Try parsing JSON
        const parsedJson = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
        
        // Validate with Zod
        const validated = schema.parse(parsedJson);
        return validated;
      } catch (error: any) {
        console.warn(`LLM attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`LLM call failed after ${retries} attempts: ${error.message}`);
        }

        // Check for permanent errors (400, 401, 403, 404)
        const status = error.status || error.response?.status;
        if (status && [400, 401, 403, 404].includes(status)) {
          throw new Error(`Permanent error ${status}: ${error.message}`);
        }

        // Base exponential backoff
        let delay = Math.min(20000, attempt * 8000);

        // Respect Retry-After for 429
        if (status === 429 && error.response?.headers?.['retry-after']) {
           const retryAfter = parseInt(error.response.headers['retry-after'], 10);
           if (!isNaN(retryAfter)) {
             delay = retryAfter * 1000;
           }
        }

        // Add randomized jitter to prevent synchronized retries (thundering herd)
        delay += Math.random() * 2000;
        
        await this.sleep(delay);
      }
    }
    throw new Error('Unreachable code');
  }
}
