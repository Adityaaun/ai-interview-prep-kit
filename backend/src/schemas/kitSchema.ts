import { z } from 'zod';

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string())
});

export const QuestionSchema = z.object({
  id: z.string().optional(), // Added manually
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3)
});

export const QuestionsArraySchema = z.array(QuestionSchema);

export const FlashcardSchema = z.object({
  id: z.string().optional(),
  requirement_ids: z.array(z.string()),
  front: z.string(),
  back: z.string()
});

export const FlashcardsArraySchema = z.array(FlashcardSchema);

// Full Appendix A Schema
export const AppendixASchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int(),
    researched_at: z.string(),
    pages_used: z.array(z.string())
  }),
  company_brief: CompanyBriefSchema,
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(z.object({
      id: z.string(),
      text: z.string(),
      kind: z.enum(['technical', 'behavioural', 'domain']),
      priority: z.enum(['must', 'nice'])
    }))
  }),
  questions: z.array(z.object({
    id: z.string(),
    requirement_ids: z.array(z.string()),
    category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
    prompt: z.string(),
    answer_outline: z.string(),
    difficulty: z.number().int().min(1).max(3)
  })),
  flashcards: z.array(z.object({
    id: z.string(),
    front: z.string(),
    back: z.string(),
    requirement_ids: z.array(z.string())
  })),
  schedule: z.object({
    days_available: z.number().int(),
    days: z.array(z.object({
      day: z.number().int(),
      focus: z.string(),
      question_ids: z.array(z.string()),
      minutes: z.number().int()
    }))
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int()
  })
});
