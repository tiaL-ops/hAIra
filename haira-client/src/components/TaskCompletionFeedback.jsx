import React from 'react';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';

// Using emoji from agent config instead of images

const AI_CONFIG = {
  // New 5-agent team
  brown: {
    emoji: AI_TEAMMATES.brown.emoji,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  elza: {
    emoji: AI_TEAMMATES.elza.emoji,
    color: AI_TEAMMATES.elza.color,
    name: AI_TEAMMATES.elza.name,
  },
  kati: {
    emoji: AI_TEAMMATES.kati.emoji,
    color: AI_TEAMMATES.kati.color,
    name: AI_TEAMMATES.kati.name,
  },
  steve: {
    emoji: AI_TEAMMATES.steve.emoji,
    color: AI_TEAMMATES.steve.color,
    name: AI_TEAMMATES.steve.name,
  },
  sam: {
    emoji: AI_TEAMMATES.sam.emoji,
    color: AI_TEAMMATES.sam.color,
    name: AI_TEAMMATES.sam.name,
  },
  // Legacy support - map old IDs to new agents
  rasoa: {
    emoji: AI_TEAMMATES.brown.emoji,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  rakoto: {
    emoji: AI_TEAMMATES.sam.emoji,
    color: AI_TEAMMATES.sam.color,
    name: AI_TEAMMATES.sam.name,
  },
  ai_manager: {
    emoji: AI_TEAMMATES.brown.emoji,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  ai_helper: {
    emoji: AI_TEAMMATES.sam.emoji,
    color: AI_TEAMMATES.sam.color,
    name: AI_TEAMMATES.sam.name,
  }
};

export default function TaskCompletionFeedback({ messages, onRemoveMessage }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className="task-completion-feedback">
      {messages.map((message) => {
        const config = AI_CONFIG[message.aiType] || AI_CONFIG.brown;
        
        return (
          <div
            key={message.id}
            className="completion-message"
            style={{ borderLeftColor: config.color }}
          >
            <div className="message-header">
              <img 
                src={config.avatar} 
                alt={`${config.name} avatar`}
                className="ai-avatar"
              />
              <span className="ai-name">{config.name}</span>
              <button
                className="close-message"
                onClick={() => onRemoveMessage(message.id)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <div className="message-content">
              {message.message}
            </div>
            <div className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
