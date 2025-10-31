import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// Only create OpenAI client if API key is present
let openai = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function generateAIResponse(userMessage, systemInstruction) {

  
  
  const client = getOpenAIClient();

  
  if (!client) {
    console.error('[OpenAI Service] ❌ NO CLIENT');
    throw new Error('OpenAI client not available. Please check your OPENAI_API_KEY environment variable.');
  }


  
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
   
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[OpenAI Service] ❌ API call FAILED:', error.message);
    throw error;
  }
}

export async function generateAIContribution(userMessage, personaConfig, systemInstruction) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not available. Please check your OPENAI_API_KEY environment variable.');
  }

  const response = await client.chat.completions.create({
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

export async function generateAIProject(prompt) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not available. Please check your OPENAI_API_KEY environment variable.');
  }

  try {
    const systemPrompt = `You are an educational AI that creates engaging learning projects. 
    Generate a project with:
    - A compelling title (max 50 characters)
    - A detailed description (2-3 sentences explaining the project)
    - 3-5 specific deliverables (array of strings)
    
    Format your response as JSON with keys: title, description, deliverables (array).
    
    Example response:
    {
      "title": "Market Research Analysis",
      "description": "Analyze consumer behavior in the tech industry through surveys, interviews, and data analysis to identify trends and opportunities.",
      "deliverables": ["Survey Design", "Data Collection", "Statistical Analysis", "Trend Report", "Recommendations"]
    }`;

    const fullPrompt = `${systemPrompt}\n\nTopic: ${prompt}`;
    
   console.log('[OpenAI Service] 📡 Making API call...');

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemInstruction },
    { role: "user", content: userMessage }
  ],
  max_tokens: 300,
  temperature: 0.7,
}).catch(error => {
  console.error('[OpenAI Service] ❌ CATCH BLOCK - API error:', error.message);
  console.error('[OpenAI Service] Error name:', error.name);
  console.error('[OpenAI Service] Error code:', error.code);
  console.error('[OpenAI Service] Error status:', error.status);
  throw error; 
});

console.log('[OpenAI Service] ✅ API call SUCCESS');
return response.choices[0].message.content;
    
    const text = response.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }
    
    // Fallback if JSON parsing fails
    return {
      title: "AI-Generated Learning Project",
      description: text.substring(0, 200) + "...",
      deliverables: ["Research", "Implementation", "Documentation"]
    };
  } catch (error) {
    console.error('Error generating AI project:', error);
    throw error;
  }
}