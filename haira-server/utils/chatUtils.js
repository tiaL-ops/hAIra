// Pure utility functions for chat logic (easily testable)

/**
 * Trim text to complete sentences within max words
 * @param {string} text - Text to trim
 * @param {number} maxWords - Maximum word count
 * @returns {string} Trimmed text with complete sentences
 */
export function trimToSentences(text, maxWords = 50) {
  const sentences = text.trim().match(/[^.!?]+[.!?]+/g) || [text];
  let result = '';
  let wordCount = 0;
  
  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    if (wordCount + sentenceWords <= maxWords) {
      result += sentence + ' ';
      wordCount += sentenceWords;
    } else {
      break;
    }
  }
  
  return result.trim() || sentences[0]; // At least return first sentence
}

/**
 * Calculate current project day with optional test override
 * @param {Date|string} projectStart - Project start date
 * @param {number} [testOverride] - Optional test day override (1-7)
 * @returns {number} Current project day (1-indexed)
 */
export function getProjectDay(projectStart, testOverride = null) {
  if (testOverride && testOverride >= 1 && testOverride <= 7) {
    return testOverride;
  }
  
  const start = new Date(projectStart);
  const now = new Date();
  const timeDiff = now.getTime() - start.getTime();
  return Math.floor(timeDiff / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Decide which agents should respond based on mentions and probabilities
 * @param {string} content - User message content
 * @param {number} currentDay - Current project day
 * @param {Object} agents - AI_AGENTS configuration
 * @returns {Object} { agents: string[], alexMentioned: boolean }
 */
export function decideResponders(content, currentDay, agents) {
  const lowerContent = content.toLowerCase();
  const isAlexActive = agents.alex.activeDays.includes(currentDay);
  
  console.log(`[chatUtils] decideResponders called:`);
  console.log(`[chatUtils]   content: "${content}"`);
  console.log(`[chatUtils]   currentDay: ${currentDay}`);
  console.log(`[chatUtils]   Alex active days:`, agents.alex.activeDays);
  console.log(`[chatUtils]   isAlexActive: ${isAlexActive}`);
  
  // Priority 1: Direct @-mentions
  if (lowerContent.includes('@rasoa')) {
    console.log(`[chatUtils]   → @Rasoa mentioned, returning ['rasoa']`);
    return { agents: ['rasoa'], alexMentioned: false };
  }
  if (lowerContent.includes('@rakoto')) {
    console.log(`[chatUtils]   → @Rakoto mentioned, returning ['rakoto']`);
    return { agents: ['rakoto'], alexMentioned: false };
  }
  if (lowerContent.includes('@alex')) {
    console.log(`[chatUtils]   → @Alex mentioned!`);
    if (isAlexActive) {
      console.log(`[chatUtils]   → Alex IS active on day ${currentDay}, returning ['alex']`);
      return { agents: ['alex'], alexMentioned: true };
    }
    // Alex mentioned but not active - teammates respond
    console.log(`[chatUtils]   → Alex NOT active on day ${currentDay}, returning ['rasoa', 'rakoto']`);
    return { agents: ['rasoa', 'rakoto'], alexMentioned: true };
  }
  
  // Priority 2: Default probability-based response
  const respondingAgents = getDefaultResponseAgents();
  console.log(`[chatUtils]   → No @-mention, using probability. Raw agents:`, respondingAgents);
  
  // Filter out Alex if not his active day
  const filtered = isAlexActive 
    ? respondingAgents 
    : respondingAgents.filter(id => id !== 'alex');
  
  console.log(`[chatUtils]   → Filtered agents:`, filtered);
  return { agents: filtered, alexMentioned: false };
}

/**
 * Get default responding agents based on probability
 * @returns {string[]} Array of agent IDs
 */
export function getDefaultResponseAgents() {
  const random = Math.random();
  
  // 40% chance: Both respond (randomize order)
  if (random < 0.4) { // Changed from 0. to 0.4
    return Math.random() < 0.5 ? ['rakoto', 'rasoa'] : ['rasoa', 'rakoto'];
  }
  // 30% chance: Only Rasoa (executes if 0.4 <= random < 0.7)
  if (random < 0.7) {
    return ['rasoa'];
  } 
  // 30% chance: Only Rakoto (executes if random >= 0.7)

  else {
    return ['rakoto'];
  }

  // The 'return []' line is no longer reachable and has been removed.
}

/**
 * Format agent name prefix, avoiding duplication
 * @param {string} agentName - Agent name (e.g., "Alex")
 * @param {string} response - AI response text
 * @param {boolean} isFirstMessage - Whether this is agent's first message
 * @returns {string} Formatted response with proper prefix
 */
export function formatAgentResponse(agentName, response, isFirstMessage) {
  // Remove existing name prefix if present
  const prefixPattern = new RegExp(`^${agentName}:\\s*`, 'i');
  let cleaned = response.replace(prefixPattern, '').trim();
  
  // Add introduction only on first message
  if (isFirstMessage && !cleaned.toLowerCase().startsWith('hi') && !cleaned.toLowerCase().startsWith('hello')) {
    return `${agentName}: Hi, I'm ${agentName}. ${cleaned}`;
  }
  
  return `${agentName}: ${cleaned}`;
}
