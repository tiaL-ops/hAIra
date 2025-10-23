import React from 'react';
import '../styles/SummarizeModal.css';

const SummarizeModal = ({ isOpen, onClose, summary, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="summarize-modal-overlay" onClick={onClose}>
      <div className="summarize-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summarize-modal-header">
          <h3>📝 AI Summary</h3>
          <button 
            className="summarize-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="summarize-modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>🤖 Generating summary...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          ) : summary ? (
            <div className="summary-content">
              <p>{summary}</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>No summary available</p>
            </div>
          )}
        </div>
        
        <div className="summarize-modal-footer">
          <button 
            className="btn-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummarizeModal;
