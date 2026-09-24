import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { LLMService } from '../src/services/LLMService';
import { JDParserService } from '../src/services/JDParserService';

const backendEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

console.log('MOCK_LLM:', process.env.MOCK_LLM);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

async function run() {
  const llm = new LLMService();
  const jdParser = new JDParserService(llm);
  
  // Access private model name just for verification reporting
  const modelName = (llm as any).model.model;
  console.log('Configured Model:', modelName);

  const start = Date.now();
  console.log('Starting single JDParserService smoke test...');
  
  try {
    const fakeJd = "Senior Node.js Developer. Must have 5 years of Express experience.";
    const result = await jdParser.parseJobDescription(fakeJd);
    const end = Date.now();
    
    console.log('JD PARSER RESULT:', JSON.stringify(result, null, 2));
    console.log(`TOTAL TIME: ${end - start}ms`);
  } catch (error: any) {
    console.error('ERROR:', error.message);
  }
}

run();
