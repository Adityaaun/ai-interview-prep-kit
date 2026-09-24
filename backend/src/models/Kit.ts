import mongoose from 'mongoose';

const kitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING' },
  progress: {
    step: { type: String, default: 'Initializing' },
    percent: { type: Number, default: 0 }
  },
  
  // Appendix A Schema
  source: {
    company: String,
    company_url: String,
    role: String,
    location: String,
    jd_chars: Number,
    researched_at: String,
    pages_used: [String],
    contextText: String
  },
  company_brief: {
    summary: String,
    what_they_do: String,
    sources: [String]
  },
  role: {
    title: String,
    seniority: String,
    responsibilities: [String],
    requirements: [{
      id: String,
      text: String,
      kind: String, // technical | behavioural | domain
      priority: String, // must | nice
      origin: { type: String, enum: ['GENERATED', 'EDITED', 'USER_CREATED'], default: 'GENERATED' }
    }]
  },
  questions: [{
    id: String,
    requirement_ids: [String],
    category: String,
    prompt: String,
    answer_outline: String,
    difficulty: Number,
    origin: { type: String, enum: ['GENERATED', 'EDITED', 'USER_CREATED'], default: 'GENERATED' }
  }],
  flashcards: [{
    id: String,
    requirement_ids: [String],
    front: String,
    back: String,
    origin: { type: String, enum: ['GENERATED', 'EDITED', 'USER_CREATED'], default: 'GENERATED' },
    practice_stats: {
      confidence_score: { type: Number, default: 0 },
      last_reviewed: Date
    }
  }],
  schedule: {
    days_available: Number,
    days: [{
      day: Number,
      focus: String,
      question_ids: [String],
      minutes: Number
    }]
  },
  coverage: {
    uncovered_requirement_ids: [String],
    passes: Number
  }
}, { timestamps: true });

export const Kit = mongoose.model('Kit', kitSchema);
