import React from 'react';
import '../styles/SummarizePopup.css';

const SummarizePopup = ({ isOpen, onClose, summary, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="summarize-popup-overlay" onClick={onClose}>
      <div className="summarize-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-title">
            <span className="popup-icon">🧠</span>
            <span className="popup-text">AI Summary</span>
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
              <div className="loading-text">🤖 Generating summary...</div>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">❌</div>
              <div className="error-text">{error}</div>
            </div>
          ) : summary ? (
            <div className="summary-content">
              <div className="summary-header">
                <span className="summary-icon">📝</span>
                <span className="summary-title">Document Summary</span>
              </div>
              <div className="summary-box">
                <div className="summary-text">{summary}</div>
              </div>
              <div className="summary-footer">
                <span className="footer-icon">✨</span>
                <span className="footer-text">AI-powered summary generated</span>
              </div>
            </div>
          ) : (
            <div className="empty-container">
              <div className="empty-icon">📄</div>
              <div className="empty-text">No content to summarize</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isLoading && !error && summary && (
          <div className="popup-actions">
            <button className="action-btn close-btn" onClick={onClose}>
              <span className="btn-text">Got it!</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummarizePopup;
