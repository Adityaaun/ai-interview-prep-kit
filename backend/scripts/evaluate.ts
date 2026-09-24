import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ResearchPipeline } from '../src/services/ResearchPipeline';
import { DraftingService } from '../src/services/DraftingService';
import { CoverageService } from '../src/services/CoverageService';
import { ScheduleService } from '../src/services/ScheduleService';
import { LLMService } from '../src/services/LLMService';
import { AppendixASchema } from '../src/schemas/kitSchema';

import { KitGenerator } from '../src/services/KitGenerator';

// Load environment variables from root .env or .env.example
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');
const exampleEnvPath = path.resolve(__dirname, '../../.env.example');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
} else if (fs.existsSync(exampleEnvPath)) {
  dotenv.config({ path: exampleEnvPath });
}

// Parse args
const args = process.argv.slice(2);
let inputPath = '';
let outputPath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputPath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[i + 1];
    i++;
  } else if (args[i].endsWith('.json') && !inputPath) {
    inputPath = args[i];
  } else if (args[i].endsWith('.json') && !outputPath) {
    outputPath = args[i];
  }
}

if (!inputPath || !outputPath) {
  console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
  process.exit(1);
}

const cwd = process.env.INIT_CWD || process.cwd();
const absInputPath = path.resolve(cwd, inputPath);
const absOutputPath = path.resolve(cwd, outputPath);

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchResult {
  version: string;
  generated_at: string;
  kits: any[];
}

async function runBatch() {
  if (!fs.existsSync(absInputPath)) {
    console.error(`Input file not found: ${absInputPath}`);
    process.exit(1);
  }

  const cases: BatchCase[] = JSON.parse(fs.readFileSync(absInputPath, 'utf8'));
  
  const results: BatchResult = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: []
  };

  for (const batchCase of cases) {
    console.log(`\nProcessing case: ${batchCase.id}`);
    
    try {
      // Generate kit natively via shared pipeline
      const result = await KitGenerator.generateKitData(batchCase.jd, batchCase.company_url, batchCase.days);

      results.kits.push({
        id: batchCase.id,
        status: "ok",
        kit: result.kit,
        error: null
      });

      console.log(`Case ${batchCase.id} completed successfully.`);

    } catch (error: any) {
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
  fs.writeFileSync(absOutputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nBatch evaluation completed. Output written to ${absOutputPath}`);
}

runBatch().catch(console.error);
