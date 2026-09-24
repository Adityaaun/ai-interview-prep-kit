"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const ResearchPipeline_1 = require("../src/services/ResearchPipeline");
const DraftingService_1 = require("../src/services/DraftingService");
const CoverageService_1 = require("../src/services/CoverageService");
const ScheduleService_1 = require("../src/services/ScheduleService");
const LLMService_1 = require("../src/services/LLMService");
const kitSchema_1 = require("../src/schemas/kitSchema");
// Load environment variables from root .env or .env.example
const rootEnvPath = path_1.default.resolve(__dirname, '../../../.env');
const exampleEnvPath = path_1.default.resolve(__dirname, '../../../.env.example');
if (fs_1.default.existsSync(rootEnvPath)) {
    dotenv_1.default.config({ path: rootEnvPath });
}
else if (fs_1.default.existsSync(exampleEnvPath)) {
    dotenv_1.default.config({ path: exampleEnvPath });
}
// Parse args
const args = process.argv.slice(2);
let inputPath = '';
let outputPath = '';
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
        inputPath = args[i + 1];
        i++;
    }
    else if (args[i] === '--output' && args[i + 1]) {
        outputPath = args[i + 1];
        i++;
    }
}
if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
}
const absInputPath = path_1.default.resolve(process.cwd(), inputPath);
const absOutputPath = path_1.default.resolve(process.cwd(), outputPath);
async function runBatch() {
    if (!fs_1.default.existsSync(absInputPath)) {
        console.error(`Input file not found: ${absInputPath}`);
        process.exit(1);
    }
    const cases = JSON.parse(fs_1.default.readFileSync(absInputPath, 'utf8'));
    const results = {
        version: "1.0",
        generated_at: new Date().toISOString(),
        kits: []
    };
    const llmService = new LLMService_1.LLMService();
    const researchPipeline = new ResearchPipeline_1.ResearchPipeline();
    const draftingService = new DraftingService_1.DraftingService(llmService);
    const coverageService = new CoverageService_1.CoverageService(draftingService);
    const scheduleService = new ScheduleService_1.ScheduleService();
    for (const batchCase of cases) {
        console.log(`\nProcessing case: ${batchCase.id}`);
        try {
            // 1. Research (Phase 2)
            const research = await researchPipeline.run(batchCase.jd, batchCase.company_url);
            const reqs = research.jdExtraction.requirements;
            const contextText = `Company Info: ${research.companyPages.map(p => p.textContent).join('\n')}\nInterview Process: ${research.interviewProcess.summary}`;
            // 2. Draft (Phase 3)
            const company_brief = await draftingService.generateCompanyBrief(contextText);
            const role = {
                title: research.jdExtraction.title,
                seniority: research.jdExtraction.seniority,
                responsibilities: research.jdExtraction.responsibilities,
                requirements: reqs.map(r => ({ ...r, origin: 'GENERATED' }))
            };
            const baseQuestionsPromises = [
                draftingService.generateQuestions('technical', reqs.filter(r => r.kind === 'technical' || r.kind === 'domain'), contextText),
                draftingService.generateQuestions('behavioural', reqs.filter(r => r.kind === 'behavioural'), contextText)
            ];
            const [techQuestions, behavQuestions] = await Promise.all(baseQuestionsPromises);
            let initialQuestions = [...techQuestions, ...behavQuestions];
            const flashcards = await draftingService.generateFlashcards(reqs, contextText);
            // 3. Coverage (Phase 3)
            const coverageResult = await coverageService.ensureCoverage(reqs, initialQuestions, contextText, 2);
            // 4. Schedule (Phase 4)
            const schedule = scheduleService.allocateSchedule(coverageResult.finalQuestions, reqs, batchCase.days);
            // Build Kit
            const kit = {
                source: {
                    company: new URL(batchCase.company_url).hostname,
                    company_url: batchCase.company_url,
                    role: role.title,
                    location: "Remote",
                    jd_chars: batchCase.jd.length,
                    researched_at: new Date().toISOString(),
                    pages_used: research.pagesUsed
                },
                company_brief,
                role,
                questions: coverageResult.finalQuestions.map(q => ({ ...q, origin: 'GENERATED' })),
                flashcards: flashcards.map(f => ({ ...f, origin: 'GENERATED' })),
                schedule,
                coverage: {
                    uncovered_requirement_ids: coverageResult.uncoveredIds,
                    passes: coverageResult.passes
                }
            };
            // 5. Validation
            const validatedKit = kitSchema_1.AppendixASchema.parse(kit);
            results.kits.push({
                id: batchCase.id,
                status: "ok",
                kit: validatedKit,
                error: null
            });
            console.log(`Case ${batchCase.id} completed successfully.`);
        }
        catch (error) {
            console.error(`Case ${batchCase.id} failed:`, error.message);
            results.kits.push({
                id: batchCase.id,
                status: "failed",
                kit: null,
                error: {
                    code: "PIPELINE_ERROR",
                    message: error.message || "An unexpected error occurred during generation."
                }
            });
        }
    }
    // Write output
    fs_1.default.writeFileSync(absOutputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\nBatch evaluation completed. Output written to ${absOutputPath}`);
}
runBatch().catch(console.error);
