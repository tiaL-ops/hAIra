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

// AI Call for Reporting Contribution Tracking
export async function generateAIContribution(userInput, personaConfig, systemInstruction) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userInput,
    systemInstruction: systemInstruction,
    generationConfig: personaConfig,
  });
  return response.text;
}