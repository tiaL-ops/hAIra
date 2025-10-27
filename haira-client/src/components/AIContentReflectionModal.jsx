import React, { useState } from 'react';
import { AI_TEAMMATES } from '../utils/teammateConfig.js';

import '../styles/AIContentReflectionModal.css';

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

 // Avatar mapping
 const avatarMap = {
  brown: BrownAvatar,
  elza: ElzaAvatar,
  kati: KatiAvatar,
  steve: SteveAvatar,
  sam: SamAvatar,
  rasoa: RasoaAvatar,
  rakoto: RakotoAvatar
};

//Get Avatar dynamically
const getMemberAvatar = (member) => {
  if (member.name === 'You') {
    return '👤';
  }
  
  // Check if member matches any AI teammate by name and get their avatar
  const aiAgent = Object.values(AI_TEAMMATES).find(agent => agent.name === member.name);
  if (aiAgent) {
    const avatarSrc = avatarMap[aiAgent.name.toLowerCase()];
    if (avatarSrc) {
      return (
        <img 
          src={avatarSrc} 
          alt={`${member.name} avatar`}
          className="ai-avatar-image"
        />
      );
    }
    // Fallback to emoji if no image found
    return aiAgent.emoji;
  }
  return '🤖';
};

function AIContentReflectionModal({ 
  isOpen, 
  aiContent, 
  aiTeammate, 
  aiCompletionMessage = '',
  onAccept, 
  onModify, 
  onDiscard,
  isLoading = false 
}) {
  const [error, setError] = useState('');
  const [showModifyArea, setShowModifyArea] = useState(false);
  const [modifiedContent, setModifiedContent] = useState('');

  const handleModifyClick = () => {
    setShowModifyArea(true);
    setModifiedContent(aiContent);
  };

  const handleModifySubmit = () => {
    if (!modifiedContent.trim()) {
      setError('Please provide modified content.');
      return;
    }

    const reflectionData = {
      aiTeammate: aiTeammate?.name || aiTeammate?.id,
      aiContent: aiContent,
      modifiedContent: modifiedContent.trim(),
      studentDecision: 'modify',
      reflection: '',
      timestamp: Date.now()
    };

    onModify(reflectionData);
    
    setError('');
    setShowModifyArea(false);
    setModifiedContent('');
  };



  const handleAction = (action) => {
    if (action === 'modify') {
      handleModifyClick();
      return;
    }

    const reflectionData = {
      aiTeammate: aiTeammate?.name || aiTeammate?.id,
      aiContent: aiContent,
      studentDecision: action,
      reflection: '',
      timestamp: Date.now()
    };

    if (action === 'accept') {
      onAccept(reflectionData);
    } else if (action === 'discard') {
      onDiscard(reflectionData);
    }

    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="ai-content-reflection-overlay">
      <div className="ai-content-reflection-modal">
        {/* AI Completion Message */}
        {aiCompletionMessage && (
          <div className="ai-completion-message">
            <div className="completion-avatar-section">
              <div className="completion-avatar">
                {getMemberAvatar(aiTeammate)}
              </div>
              <span className="ai-name">{aiTeammate?.name}</span>
            </div>
            <div className="completion-message-bubble">
              <p className="completion-text">{aiCompletionMessage}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="reflection-content">
          <div className="ai-content-preview">
            <div className="preview-header">
              <span className="preview-icon">📝</span>
              <span>AI Generated Content</span>
            </div>
            <div className="preview-content">
              <div className="ai-content-prefix">
                <strong>[{aiTeammate?.name} - {aiTeammate?.role}]</strong>
              </div>
              <div 
                className="ai-content-html"
                dangerouslySetInnerHTML={{ __html: aiContent || '' }}
              />
            </div>
          </div>

          {showModifyArea && (
            <div className="modify-content-area">
              <div className="modify-header">
                <h4>✏️ Modify Content</h4>
                <p>Edit the AI-generated content below:</p>
              </div>
              <textarea
                value={modifiedContent}
                onChange={(e) => setModifiedContent(e.target.value)}
                className="modify-textarea"
                rows={8}
                placeholder="Edit the content here..."
              />
            </div>
          )}
        </div>

        <div className="reflection-actions">
          {!showModifyArea ? (
            <>
              <button
                onClick={() => handleAction('discard')}
                disabled={isLoading}
                className="action-btn discard-btn"
                title="Don't use this content"
              >
                <span className="btn-icon">❌</span>
                <span className="btn-text">DISCARD</span>
              </button>
              <button
                onClick={() => handleAction('modify')}
                disabled={isLoading}
                className="action-btn modify-btn"
                title="Use but modify this content"
              >
                <span className="btn-icon">✏️</span>
                <span className="btn-text">MODIFY</span>
              </button>
              <button
                onClick={() => handleAction('accept')}
                disabled={isLoading}
                className="action-btn accept-btn"
                title="Use this content as-is"
              >
                <span className="btn-icon">✅</span>
                <span className="btn-text">ACCEPT</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowModifyArea(false)}
                disabled={isLoading}
                className="action-btn discard-btn"
                title="Cancel modification"
              >
                <span className="btn-icon">❌</span>
                <span className="btn-text">CANCEL</span>
              </button>
              <button
                onClick={handleModifySubmit}
                disabled={isLoading}
                className="action-btn accept-btn"
                title="Submit modified content"
              >
                <span className="btn-icon">✅</span>
                <span className="btn-text">SUBMIT</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIContentReflectionModal;
