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