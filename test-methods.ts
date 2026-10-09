import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testGenerateContent() {
  console.log('Testing ai.models.generateContent...');
  const start = Date.now();
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Hello',
    });
    console.log(`generateContent success in ${Date.now() - start}ms:`, res.text);
  } catch (err: any) {
    console.error(`generateContent error after ${Date.now() - start}ms:`, err);
  }
}

testGenerateContent();
