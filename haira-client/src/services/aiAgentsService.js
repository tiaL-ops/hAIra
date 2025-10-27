// Service to fetch AI agents configuration from server
let cachedAgents = null;
const backend_host = import.meta.env.VITE_BACKEND_HOST;

export async function getAIAgents() {
  if (cachedAgents) {
    return cachedAgents;
  }

  try {
    const response = await fetch(`${backend_host}/api/ai-agents`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    cachedAgents = await response.json();
    return cachedAgents;
  } catch (error) {
    console.error('Error fetching AI agents:', error);
    // Return fallback data if server is unavailable
    return {
      AI_AGENTS: {},
      AI_TEAMMATES: {},
      TASK_TYPES: {}
    };
  }
}

// Helper function to get specific agent data
export async function getAIAgent(agentId) {
  const agents = await getAIAgents();
  return agents.AI_AGENTS[agentId] || null;
}

// Helper function to get all agent IDs
export async function getAIAgentIds() {
  const agents = await getAIAgents();
  return Object.keys(agents.AI_AGENTS);
}
