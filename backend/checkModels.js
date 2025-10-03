// backend/checkModels.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  try {
    console.log("Checking for available models with your API key...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.listModels;

    console.log("✅ Here are the models you can use:");
    for await (const m of models) {
        if (m.supportedGenerationMethods.includes('generateContent')) {
            console.log(' - ', m.name);
        }
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();