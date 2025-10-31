import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// Only create Gemini client if API key is present
let ai = null;

function getGeminiClient() {
  if (!ai && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {    
    ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
  }
  return ai;
}

export async function generateAIResponse(userMessage, systemInstruction) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available. Please check your GEMINI_API_KEY environment variable.');
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    systemInstruction: systemInstruction,
    generationConfig: {
      maxOutputTokens: 100,
      temperature: 0.7,
    },
  });
  return response.text;
}

export async function generateGradeResponse(userSubmission, systemInstruction) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available. Please check your GEMINI_API_KEY environment variable.');
  }

  // prompt for submission
  const prompt = `
${systemInstruction}

Submission:
${userSubmission}
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt, 
    generationConfig: {
      maxOutputTokens: 20,
      temperature: 0.0, // deterministic answer from gemini
      responseMimeType: "application/json"  // return JSON, easier to handle
    },
  });

  return response.text;
}

export async function generateDeliverablesResponse(title, systemInstruction) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available. Please check your GEMINI_API_KEY environment variable.');
  }

  const prompt = `
${systemInstruction}

Submission:
${title}
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    generationConfig: {
      maxOutputTokens: 20,
      temperature: 0.0,
      responseMimeType: "application/json"
    },
  });

  return response.text;
}

// AI Call for Reporting Contribution Tracking in Submission
export async function generateAIContribution(userInput, personaConfig, systemInstruction) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available. Please check your GEMINI_API_KEY environment variable.');
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userInput,
    systemInstruction: systemInstruction,
    generationConfig: {
      ...personaConfig,
      responseMimeType: "text/plain",
    },
  });
  return response.text;
}

// Chrome Write API for writing tasks
export async function getChromeWriteSuggestion(prompt) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available. Please check your GEMINI_API_KEY environment variable.');
  }

  // This would integrate with Chrome's writing API
  // For now, we'll use Gemini with writing-optimized settings
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    systemInstruction: "You are a professional writing assistant. Provide clear, well-structured content that flows naturally and is engaging to read.",
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7,
      stopSequences: ["\n\n", "---", "**"],
      responseMimeType: "text/plain",
    },
  });
  return response.text;
}