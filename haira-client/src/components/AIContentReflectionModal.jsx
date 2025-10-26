import React, { useState } from 'react';
import '../styles/AIContentReflectionModal.css';

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
                {aiTeammate?.avatar?.startsWith('http') ? (
                  <img 
                    src={aiTeammate.avatar} 
                    alt={aiTeammate?.name} 
                    className="avatar-image"
                  />
                ) : (
                  <span className="avatar-emoji">{aiTeammate?.avatar || '🤖'}</span>
                )}
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
                ❌ Discard
              </button>
              <button
                onClick={() => handleAction('modify')}
                disabled={isLoading}
                className="action-btn modify-btn"
                title="Use but modify this content"
              >
                ✏️ Modify
              </button>
              <button
                onClick={() => handleAction('accept')}
                disabled={isLoading}
                className="action-btn accept-btn"
                title="Use this content as-is"
              >
                ✅ Accept
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
                ❌ Cancel
              </button>
              <button
                onClick={handleModifySubmit}
                disabled={isLoading}
                className="action-btn accept-btn"
                title="Submit modified content"
              >
                ✅ Submit Modified
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIContentReflectionModal;
