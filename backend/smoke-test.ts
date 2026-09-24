import { LLMService } from './src/services/LLMService';
import { JDParserService } from './src/services/JDParserService';
import dotenv from 'dotenv';
dotenv.config();

async function runSmokeTest() {
  console.log("Starting smoke test...");
  try {
    const llmService = new LLMService();
    const parser = new JDParserService(llmService);
    
    const jd = "Looking for a senior frontend developer with 5 years React experience.";
    console.log("Parsing thin JD...");
    
    const result = await parser.parseJobDescription(jd);
    console.log("Success!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    process.exit(1);
  }
}

runSmokeTest();
