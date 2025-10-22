import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

export async function generateAIResponse(userMessage, systemInstruction) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    systemInstruction: systemInstruction,
    generationConfig: {
      maxOutputTokens: 50,
      temperature: 0.7,
    },
  });
  return response.text;
}

export async function generateGradeResponse(userSubmission, systemInstruction) {
  // prompt for submission
  const prompt = `
${systemInstruction}

Submission:
${userSubmission}
`;

  const response = await ai.models.generateContent({
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
  const prompt = `
${systemInstruction}

Submission:
${title}
`;

  const response = await ai.models.generateContent({
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
  const response = await ai.models.generateContent({
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
  // This would integrate with Chrome's writing API
  // For now, we'll use Gemini with writing-optimized settings
  const response = await ai.models.generateContent({
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