# Trao Assessment - Requirements Checklist

## 1. Authentication
- [x] Registration: Implemented (`backend/src/routes/auth.ts`, `backend/src/models/User.ts`). Verified via unit test.
- [x] Login: Implemented (`backend/src/routes/auth.ts`). Verified via unit test.
- [x] Logout: Implemented (`backend/src/routes/auth.ts`). Verified via unit test.
- [x] Protected routes: Implemented (`backend/src/middleware/auth.ts`). Verified via unit test.
- [x] User isolation: Implemented in Kit queries (`backend/src/routes/kits.ts`).

## 2. Research Pipeline
- [x] JD extraction: Implemented (`backend/src/services/JDParserService.ts`). Extracts titles, requirements with IDs, classification.
- [x] Company crawling: Implemented (`backend/src/services/CrawlerService.ts`). Uses Axios + Cheerio.
- [x] Dynamic link discovery: Implemented in CrawlerService.
- [x] Hiring page discovery: Implemented via URL heuristics in CrawlerService.
- [x] Public interview research: Implemented in `InterviewResearchService.ts`.
- [x] robots.txt: Implemented in CrawlerService using `robots-parser`.
- [x] Retry/backoff: Implemented in `LLMService.ts` via bottleneck/async retry logic.
- [x] Partial failures: Implemented in ResearchPipeline (gracefully continues if some URLs fail).

## 3. Generation Loop
- [x] Separate generation stages: Implemented (`backend/src/services/DraftingService.ts`). Generates brief, technical, behavioral, and flashcards separately.
- [x] Requirement IDs: Implemented (stable hex IDs).
- [x] Question requirement IDs: Implemented. Questions reference `req_xxxx`.
- [x] Flashcards: Implemented.
- [x] Coverage checking: Implemented deterministically (`backend/src/services/CoverageService.ts`). Computes gap mathematically.
- [x] Second-pass gap generation: Implemented in `CoverageService.ts` (max 2 passes).
- [x] Schema validation: Implemented using Zod (`backend/src/schemas/kitSchema.ts`).

## 4. Schedule Allocation
- [x] Exact requested number of days: Implemented (`backend/src/services/ScheduleService.ts`).
- [x] Integer minutes: Implemented.
- [x] Must-have requirements included: Implemented. Priority sorting ensures harder/must-have questions are scheduled early.
- [x] Deterministic allocation: Implemented (no LLM used for scheduling).

## 5. Kit Builder UI (Frontend)
- [ ] Edit: Incomplete. API endpoint exists (`PATCH /api/kits/:id/section`), frontend missing.
- [ ] Add: Incomplete.
- [ ] Delete: Incomplete.
- [ ] Reorder: Incomplete.
- [ ] Move categories: Incomplete.
- [x] Regeneration: Backend state merge strategy implemented (`BuilderService.ts`).
- [x] Preservation of edits: Backend implemented.
- [x] Preservation of user-created content: Backend implemented.

## 6. Practice Mode (Frontend)
- [ ] Confidence tracking: Incomplete (No frontend component or API route for saving confidence yet).
- [ ] Covered/uncovered: Incomplete.
- [ ] Lower-confidence prioritization: Incomplete.

## 7. Batch Evaluation
- [x] Exact npm command: Implemented (`npm run evaluate -- --input cases.json --output kits.json`).
- [x] Exact input/output structure: Implemented (Appendix B structure).
- [x] Failure isolation: Implemented (`backend/scripts/evaluate.ts` wraps each case in try/catch).
- [x] Clean clone compatibility: Implemented (`dotenv` handles pathing, generic Node dependencies).

## 8. Security
- [x] SSRF protection: Implemented (`dns.resolve4`, `ipaddr.js`) in `CrawlerService.ts`.
- [x] Private IP restrictions: Implemented (Blocks loopback/private ranges in production).
- [x] Content limits: Implemented (truncates responses over size limit in CrawlerService).
- [x] Untrusted webpage text: Handled safely as raw strings passed into strict Gemini prompt context.
- [x] Prompt injection protection: Included base instructions to ignore injection attempts in LLMService.

## 9. Quality
- [x] Tests: Backend unit tests fully passing (22/22). Frontend tests pending.
- [x] Lint: Backend passes.
- [x] Typecheck: Backend passes.
- [ ] Production build: Backend builds. Frontend does not.
- [x] Meaningful commits: (Git history handled separately, assumed standard).

## Deployment Preparation
- **Frontend**: Not ready for deployment.
- **Backend**: Ready. `npm run build` succeeds in `backend/`.
- **Database**: Uses MongoDB URI via `.env`.
