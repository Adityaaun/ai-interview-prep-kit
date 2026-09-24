import { Router, Request, Response, NextFunction } from 'express';
import { Kit } from '../models/Kit';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { ResearchPipeline } from '../services/ResearchPipeline';
import { DraftingService } from '../services/DraftingService';
import { CoverageService } from '../services/CoverageService';
import { ScheduleService } from '../services/ScheduleService';
import { LLMService } from '../services/LLMService';
import { BuilderService } from '../services/BuilderService';
import { KitGenerator } from '../services/KitGenerator';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jd, company_url, days } = req.body;
    
    if (!jd || !company_url || !days) {
      return res.status(400).json({ error: 'Missing jd, company_url, or days' });
    }

    const result = await KitGenerator.generateKitData(jd, company_url, days, req.user!.id);
    res.status(201).json({ id: result.id, status: result.status });
  } catch (error: any) {
    console.error("Kit generation failed:", error);
    res.status(500).json({ error: error.message || 'Kit generation failed' });
  }
});

router.post('/batch', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = req.body;
    
    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'Body must be an array of roles' });
    }
    
    if (roles.length === 0) {
      return res.status(400).json({ error: 'Empty roles array' });
    }

    if (roles.length > 10) {
      return res.status(400).json({ error: 'Exceeded maximum batch size of 10 roles' });
    }

    const results = await Promise.allSettled(roles.map(async (role) => {
      const { jd, company_url, days } = role;
      if (!jd || !company_url || !days) {
        throw new Error('Missing jd, company_url, or days');
      }
      return await KitGenerator.generateKitData(jd, company_url, Number(days), req.user!.id);
    }));

    const responsePayload = results.map((result) => {
      if (result.status === 'fulfilled') {
        return { success: true, id: result.value.id };
      } else {
        return { success: false, error: result.reason?.message || 'Unknown error' };
      }
    });

    res.status(200).json({ results: responsePayload });
  } catch (error: any) {
    console.error("Batch generation failed:", error);
    res.status(500).json({ error: error.message || 'Batch generation failed' });
  }
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const kits = await Kit.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    // Map _id to id for the frontend
    const mapped = kits.map(k => {
      const obj = k.toObject() as any;
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    
    const obj = kit.toObject() as any;
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { section, data } = req.body;
    if (!section || !data) return res.status(400).json({ error: 'Missing section or data' });

    const allowedSections = ['company_brief', 'questions', 'flashcards', 'schedule'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    (kit as any)[section] = data;
    await kit.save();

    res.json({ message: 'Updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/regenerate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { section } = req.body;
    if (!section) return res.status(400).json({ error: 'Missing section' });

    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const llmService = new LLMService();
    const draftingService = new DraftingService(llmService);
    const builderService = new BuilderService();
    const scheduleService = new ScheduleService();

    const contextText = kit.source?.contextText || '';
    const reqs = kit.role?.requirements || [];

    if (section === 'brief') {
      const company_brief = await draftingService.generateCompanyBrief(contextText);
      kit.company_brief = company_brief;
    } else if (section.startsWith('questions/')) {
      const category = section.split('/')[1];
      const relevantReqs = reqs.filter((r: any) => category === 'technical' ? (r.kind === 'technical' || r.kind === 'domain') : r.kind === 'behavioural');
      const newQuestions = await draftingService.generateQuestions(category, relevantReqs, contextText);
      const mergedQuestions = builderService.mergeSection(kit.questions as any, newQuestions, category);
      kit.questions = mergedQuestions as any;
    } else if (section === 'schedule') {
      const schedule = scheduleService.allocateSchedule(kit.questions as any, reqs, kit.schedule?.days_available || 5);
      kit.schedule = schedule as any;
    } else if (section === 'flashcards') {
      const newFlashcards = await draftingService.generateFlashcards(reqs, contextText);
      const mergedFlashcards = builderService.mergeSection(kit.flashcards as any, newFlashcards);
      kit.flashcards = mergedFlashcards as any;
    } else {
      return res.status(400).json({ error: 'Unsupported section for regeneration' });
    }

    await kit.save();
    
    const obj = kit.toObject() as any;
    obj.id = obj._id;
    res.json(obj);
  } catch (error: any) {
    console.error("Regeneration failed:", error);
    res.status(500).json({ error: error.message || 'Regeneration failed' });
  }
});

export default router;
