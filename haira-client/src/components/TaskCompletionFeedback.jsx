import React from 'react';
import { AI_TEAMMATES } from '../../../haira-server/config/aiReportAgents.js';
import AlexAvatar from '../images/Alex.png';
import SamAvatar from '../images/Sam.png';

const AI_CONFIG = {
  ai_manager: {
    emoji: AI_TEAMMATES.MANAGER.emoji,
    color: AI_TEAMMATES.MANAGER.color,
    name: `${AI_TEAMMATES.MANAGER.name} (${AI_TEAMMATES.MANAGER.role})`,
    avatar: AlexAvatar
  },
  ai_helper: {
    emoji: AI_TEAMMATES.LAZY.emoji,
    color: AI_TEAMMATES.LAZY.color,
    name: `${AI_TEAMMATES.LAZY.name} (${AI_TEAMMATES.LAZY.role})`,
    avatar: SamAvatar
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
