import React from 'react';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

const AI_CONFIG = {
  // New 5-agent team
  brown: {
    avatar: BrownAvatar,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  elza: {
    avatar: ElzaAvatar,
    color: AI_TEAMMATES.elza.color,
    name: AI_TEAMMATES.elza.name,
  },
  kati: {
    avatar: KatiAvatar,
    color: AI_TEAMMATES.kati.color,
    name: AI_TEAMMATES.kati.name,
  },
  steve: {
    avatar: SteveAvatar,
    color: AI_TEAMMATES.steve.color,
    name: AI_TEAMMATES.steve.name,
  },
  sam: {
    avatar: SamAvatar,
    color: AI_TEAMMATES.sam.color,
    name: AI_TEAMMATES.sam.name,
  },
  // Legacy support - map old IDs to new agents
  rasoa: {
    avatar: RasoaAvatar,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  rakoto: {
    avatar: RakotoAvatar,
    color: AI_TEAMMATES.sam.color,
    name: AI_TEAMMATES.sam.name,
  },
  ai_manager: {
    avatar: BrownAvatar,
    color: AI_TEAMMATES.brown.color,
    name: AI_TEAMMATES.brown.name,
  },
  ai_helper: {
    avatar: SamAvatar,
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
                className="ai-avatar-completion"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${config.color}`
                }}
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
