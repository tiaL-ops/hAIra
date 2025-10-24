import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIResponse(userMessage, systemInstruction) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userMessage }
    ],
    max_tokens: 300, // Increased from 100 to allow AI to list tasks and provide detailed responses
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}

export async function generateAIContribution(userMessage, personaConfig, systemInstruction) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userMessage }
    ],
    max_tokens: personaConfig.max_tokens, // Increased from 100 to allow AI to list tasks and provide detailed responses
    temperature: personaConfig.temperature,
  });
  
  return response.choices[0].message.content;
}
