import React, { useState } from 'react';

export default function ProofreadSuggestion({ 
  originalText, 
  correctedText, 
  onApply, 
  onDiscard, 
  onClose 
}) {
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(correctedText);
      onClose();
    } catch (error) {
      console.error('Error applying correction:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onClose();
  };

  return (
    <div className="proofread-suggestion-overlay">
      <div className="proofread-suggestion-modal">
        <div className="suggestion-header">
          <h3>🔧 Proofreading Suggestion</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="suggestion-content">
          <div className="text-comparison">
            <div className="original-text">
              <label>Original:</label>
              <div className="text-box original">{originalText}</div>
            </div>
            
            <div className="arrow">→</div>
            
            <div className="corrected-text">
              <label>Suggested:</label>
              <div className="text-box corrected">{correctedText}</div>
            </div>
          </div>
          
          <div className="suggestion-actions">
            <button 
              className="apply-btn"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : '✅ Apply Suggestion'}
            </button>
            
            <button 
              className="discard-btn"
              onClick={handleDiscard}
            >
              ❌ Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
