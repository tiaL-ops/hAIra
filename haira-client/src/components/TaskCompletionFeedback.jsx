import React, { useState, useEffect } from 'react';
import { getAIAgents } from '../services/aiAgentsService.js';

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

export default function TaskCompletionFeedback({ messages, onRemoveMessage }) {
  const [aiAgents, setAiAgents] = useState({ AI_TEAMMATES: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAiAgents(agents);
      } catch (error) {
        console.error('Error loading AI agents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAIAgents();
  }, []);

  const getAIConfig = (aiType) => {
    const AI_CONFIG = {
      // New 5-agent team
      brown: {
        avatar: BrownAvatar,
        color: aiAgents.AI_TEAMMATES.brown?.color || '#8B4513',
        name: aiAgents.AI_TEAMMATES.brown?.name || 'Brown',
      },
      elza: {
        avatar: ElzaAvatar,
        color: aiAgents.AI_TEAMMATES.elza?.color || '#FF69B4',
        name: aiAgents.AI_TEAMMATES.elza?.name || 'Elza',
      },
      kati: {
        avatar: KatiAvatar,
        color: aiAgents.AI_TEAMMATES.kati?.color || '#4A90E2',
        name: aiAgents.AI_TEAMMATES.kati?.name || 'Kati',
      },
      steve: {
        avatar: SteveAvatar,
        color: aiAgents.AI_TEAMMATES.steve?.color || '#2ECC71',
        name: aiAgents.AI_TEAMMATES.steve?.name || 'Steve',
      },
      sam: {
        avatar: SamAvatar,
        color: aiAgents.AI_TEAMMATES.sam?.color || '#E67E22',
        name: aiAgents.AI_TEAMMATES.sam?.name || 'Sam',
      },
      // Legacy support - map old IDs to new agents
      rasoa: {
        avatar: RasoaAvatar,
        color: aiAgents.AI_TEAMMATES.brown?.color || '#8B4513',
        name: aiAgents.AI_TEAMMATES.brown?.name || 'Brown',
      },
      rakoto: {
        avatar: RakotoAvatar,
        color: aiAgents.AI_TEAMMATES.sam?.color || '#E67E22',
        name: aiAgents.AI_TEAMMATES.sam?.name || 'Sam',
      },
      ai_manager: {
        avatar: BrownAvatar,
        color: aiAgents.AI_TEAMMATES.brown?.color || '#8B4513',
        name: aiAgents.AI_TEAMMATES.brown?.name || 'Brown',
      },
      ai_helper: {
        avatar: SamAvatar,
        color: aiAgents.AI_TEAMMATES.sam?.color || '#E67E22',
        name: aiAgents.AI_TEAMMATES.sam?.name || 'Sam',
      }
    };
    return AI_CONFIG[aiType] || AI_CONFIG.brown;
  };

  if (!messages || messages.length === 0) {
    return null;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="task-completion-feedback">
      {messages.map((message) => {
        const config = getAIConfig(message.aiType);
        
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
