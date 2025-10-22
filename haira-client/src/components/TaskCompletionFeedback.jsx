import React from 'react';

const AI_CONFIG = {
  ai_manager: {
    emoji: '🧠',
    color: '#4A90E2',
    name: 'Alex (Project Manager)'
  },
  ai_helper: {
    emoji: '😴',
    color: '#93C263',
    name: 'Sam (Helper)'
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
              <span className="ai-emoji">{config.emoji}</span>
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
