// AI Configuration Service - Handles conditional API selection based on environment
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

dotenv.config();

// Configuration state
let aiConfig = null;
let openaiClient = null;
let geminiClient = null;

/**
 * Initialize AI configuration based on environment variables
 * @returns {Object} Configuration object with selected API and mode
 */
export function initializeAIConfig() {
  if (aiConfig) {
    return aiConfig; // Return cached config
  }

  const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';


  if (hasOpenAIKey) {
    // Dev/Deployed Mode: Use OpenAI
    aiConfig = {
      mode: 'openai',
      primary: 'openai',
      fallback: 'gemini',
      description: 'Production Mode - OpenAI primary, Gemini fallback'
    };
  } else if (hasGeminiKey) {
    // Local Mode: Use Gemini only
    aiConfig = {
      mode: 'gemini',
      primary: 'gemini',
      fallback: null,
      description: 'Local Mode - Gemini only'
    };
  } else {
    // No API keys available
    aiConfig = {
      mode: 'none',
      primary: null,
      fallback: null,
      description: 'No API Keys Available'
    };
  }

  return aiConfig;
}

/**
 * Get OpenAI client (only created if OpenAI key is present)
 * @returns {OpenAI|null} OpenAI client or null if not available
 */
export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Get Gemini client (only created if Gemini key is present)
 * @returns {GoogleGenAI|null} Gemini client or null if not available
 */
export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI(process.env.GEMINI_API_KEY);
  }

  return geminiClient;
}

/**
 * Get the current AI configuration
 * @returns {Object} Current AI configuration
 */
export function getAIConfig() {
  if (!aiConfig) {
    return initializeAIConfig();
  }
  return aiConfig;
}

/**
 * Check if a specific API is available
 * @param {string} api - API name ('openai' or 'gemini')
 * @returns {boolean} True if API is available
 */
export function isAPIAvailable(api) {
  const config = getAIConfig();
  
  if (api === 'openai') {
    return config.primary === 'openai' || config.fallback === 'openai';
  } else if (api === 'gemini') {
    return config.primary === 'gemini' || config.fallback === 'gemini';
  }
  
  return false;
}

/**
 * Get the primary API to use
 * @returns {string|null} Primary API name or null if none available
 */
export function getPrimaryAPI() {
  const config = getAIConfig();
  return config.primary;
}

/**
 * Get the fallback API to use
 * @returns {string|null} Fallback API name or null if none available
 */
export function getFallbackAPI() {
  const config = getAIConfig();
  return config.fallback;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetAIConfig() {
  aiConfig = null;
  openaiClient = null;
  geminiClient = null;
}

// Initialize configuration on module load
initializeAIConfig();
