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
    max_tokens: 100,
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}
