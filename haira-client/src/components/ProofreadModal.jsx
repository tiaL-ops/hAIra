import React, { useState } from 'react';
import '../styles/ProofreadModal.css';

const ProofreadModal = ({ isOpen, onClose, proofreadData, isLoading, error }) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  if (!isOpen) return null;

  const handleApplySuggestion = (suggestion) => {
    // This would be implemented to apply the suggestion to the editor
    console.log('Applying suggestion:', suggestion);
    // For now, just close the modal
    onClose();
  };

  return (
    <div className="proofread-modal-overlay" onClick={onClose}>
      <div className="proofread-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proofread-modal-header">
          <h3>✍️ AI Proofreading</h3>
          <button 
            className="proofread-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="proofread-modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>🤖 Analyzing text for improvements...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          ) : proofreadData && proofreadData.suggestions ? (
            <div className="proofread-content">
              <div className="original-text">
                <h4>📝 Original Text:</h4>
                <p>{proofreadData.originalText}</p>
              </div>
              
              <div className="suggestions">
                <h4>💡 Suggestions:</h4>
                {proofreadData.suggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className={`suggestion-item ${selectedSuggestion === index ? 'selected' : ''}`}
                    onClick={() => setSelectedSuggestion(index)}
                  >
                    <div className="suggestion-header">
                      <span className="suggestion-type">{suggestion.type}</span>
                      <span className="suggestion-confidence">
                        {suggestion.confidence}% confidence
                      </span>
                    </div>
                    <div className="suggestion-content">
                      <p><strong>Issue:</strong> {suggestion.issue}</p>
                      <p><strong>Suggested fix:</strong> {suggestion.suggestion}</p>
                      {suggestion.explanation && (
                        <p><strong>Explanation:</strong> {suggestion.explanation}</p>
                      )}
                    </div>
                    <div className="suggestion-actions">
                      <button 
                        className="btn-apply"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplySuggestion(suggestion);
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No proofreading suggestions available</p>
            </div>
          )}
        </div>
        
        <div className="proofread-modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofreadModal;
