import React from 'react';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';

// Using emoji from agent config instead of images

const AI_CONFIG = {
  rasoa: {
    emoji: AI_TEAMMATES.rasoa.emoji,
    color: AI_TEAMMATES.rasoa.color,
    name: AI_TEAMMATES.rasoa.name,
  },
  rakoto: {
    emoji: AI_TEAMMATES.rakoto.emoji,
    color: AI_TEAMMATES.rakoto.color,
    name: AI_TEAMMATES.rakoto.name,
  },
  // Legacy support
  ai_manager: {
    emoji: AI_TEAMMATES.rasoa.emoji,
    color: AI_TEAMMATES.rasoa.color,
    name: AI_TEAMMATES.rasoa.name,
  },
  ai_helper: {
    emoji: AI_TEAMMATES.rakoto.emoji,
    color: AI_TEAMMATES.rakoto.color,
    name: AI_TEAMMATES.rakoto.name,
  }
};

export default function TaskCompletionFeedback({ messages, onRemoveMessage }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className="task-completion-feedback">
      {messages.map((message) => {
        const config = AI_CONFIG[message.aiType] || AI_CONFIG.ai_manager;
        
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
