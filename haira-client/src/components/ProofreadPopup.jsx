import React from 'react';
import '../styles/ProofreadPopup.css';

const ProofreadPopup = ({ isOpen, onClose, proofreadData, isLoading, error, onApply, onDiscard }) => {
  if (!isOpen) return null;

  const handleApply = () => {
    if (onApply && proofreadData?.correctedText) {
      onApply(proofreadData.correctedText);
    }
    onClose();
  };

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    }
    onClose();
  };

  return (
    <div className="proofread-popup-overlay" onClick={onClose}>
      <div className="proofread-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-title">
            <span className="popup-icon">✍️</span>
            <span className="popup-text">AI Proofreader</span>
          </div>
          <button className="popup-close-btn" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="popup-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">🔍 Analyzing text...</div>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">❌</div>
              <div className="error-text">{error}</div>
            </div>
          ) : proofreadData ? (
            <div className="proofread-content">
              {/* Original Text */}
              <div className="text-section">
                <div className="section-header">
                  <span className="section-icon">📝</span>
                  <span className="section-title">Original Text</span>
                </div>
                <div className="text-box original-text">
                  <div className="text-content">"{proofreadData.originalText}"</div>
                </div>
              </div>

              {/* Arrow */}
              <div className="arrow-container">
                <div className="arrow">↓</div>
              </div>

              {/* Corrected Text */}
              <div className="text-section">
                <div className="section-header">
                  <span className="section-icon">✨</span>
                  <span className="section-title">Corrected Text</span>
                </div>
                <div className="text-box corrected-text">
                  <div className="text-content">"{proofreadData.correctedText}"</div>
                </div>
              </div>

              {/* Source Info */}
              <div className="source-info">
                <span className="source-icon">🤖</span>
                <span className="source-text">Powered by {proofreadData.source}</span>
              </div>
            </div>
          ) : (
            <div className="empty-container">
              <div className="empty-icon">📄</div>
              <div className="empty-text">No text to proofread</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isLoading && !error && proofreadData && (
          <div className="popup-actions">
            <button className="action-btn discard-btn" onClick={handleDiscard}>
              <span className="btn-icon">❌</span>
              <span className="btn-text">Discard</span>
            </button>
            <button className="action-btn apply-btn" onClick={handleApply}>
              <span className="btn-icon">✅</span>
              <span className="btn-text">Apply</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofreadPopup;
