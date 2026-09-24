import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import kitsRouter from './kits';
import { Kit } from '../models/Kit';
import { DraftingService } from '../services/DraftingService';
import { LLMService } from '../services/LLMService';

// Mock authentication middleware
vi.mock('../middlewares/authMiddleware', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/kits', kitsRouter);

describe('Kits Router - Regenerate Context Regression', () => {
  it('should pass internalContext to the LLM during regeneration', async () => {
    const mockContext = "Test Company internal context data";
    
    // Mock the kit found in the DB
    const mockKit = {
      _id: 'test-kit-id',
      userId: 'test-user-id',
      internalContext: mockContext,
      role: { requirements: [] },
      company_brief: { summary: '', what_they_do: '', sources: [] },
      toObject: () => ({ id: 'test-kit-id' }),
      save: vi.fn().mockResolvedValue(true)
    };
    
    vi.spyOn(Kit, 'findOne').mockResolvedValue(mockKit as any);

    // Spy on DraftingService to see what contextText it receives
    const generateBriefSpy = vi.spyOn(DraftingService.prototype, 'generateCompanyBrief').mockResolvedValue({
      summary: 'Test summary',
      what_they_do: 'Test do',
      sources: []
    });

    const res = await request(app)
      .post('/kits/test-kit-id/regenerate')
      .send({ section: 'brief' });

    expect(res.status).toBe(200);
    // The critical assertion: the contextText passed to generateCompanyBrief MUST NOT be empty
    expect(generateBriefSpy).toHaveBeenCalledWith(mockContext);
  });
});
