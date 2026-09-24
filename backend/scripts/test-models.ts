import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

const backendEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || 'dummy';
  console.log('Key length:', apiKey.length);
  // Unfortunately, the @google/generative-ai SDK doesn't expose ListModels directly easily.
  // We can just try changing it to gemini-1.5-pro or gemini-pro and see.
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent("hello");
    console.log("gemini-1.5-flash-latest success");
    return;
  } catch (e: any) {
    console.log("gemini-1.5-flash-latest error:", e.message);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent("hello");
    console.log("gemini-pro success");
    return;
  } catch (e: any) {
    console.log("gemini-pro error:", e.message);
  }
}

listModels();
