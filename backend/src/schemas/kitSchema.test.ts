import { describe, it, expect } from 'vitest';
import { AppendixASchema } from './kitSchema';

describe('AppendixASchema', () => {
  const validKit = {
    source: {
      company: "Trao",
      company_url: "https://trao.com",
      role: "Engineer",
      location: "Remote",
      jd_chars: 100,
      researched_at: "2026-09-22T00:00:00Z",
      pages_used: ["https://trao.com/about"]
    },
    company_brief: {
      summary: "AI Co",
      what_they_do: "AI things",
      sources: []
    },
    role: {
      title: "Engineer",
      seniority: "Senior",
      responsibilities: ["Code"],
      requirements: [
        { id: "req_1", text: "React", kind: "technical", priority: "must" }
      ]
    },
    questions: [
      { id: "q_1", requirement_ids: ["req_1"], category: "technical", prompt: "Explain React", answer_outline: "Hooks", difficulty: 2 }
    ],
    flashcards: [
      { id: "f_1", front: "React hook", back: "useState", requirement_ids: ["req_1"] }
    ],
    schedule: {
      days_available: 5,
      days: [
        { day: 1, focus: "React", question_ids: ["q_1"], minutes: 60 }
      ]
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2
    }
  };

  it('should validate a complete and correct kit', () => {
    const result = AppendixASchema.safeParse(validKit);
    expect(result.success).toBe(true);
  });

  it('should fail on missing fields', () => {
    const invalidKit = { ...validKit, questions: undefined };
    const result = AppendixASchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
  });

  it('should fail on malformed difficulty', () => {
    const invalidKit = { 
      ...validKit, 
      questions: [{ ...validKit.questions[0], difficulty: 5 }] // max is 3
    };
    const result = AppendixASchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
  });
});
