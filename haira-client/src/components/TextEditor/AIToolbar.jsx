// src/components/TextEditor/AIToolbar.jsx
import React, { useState } from "react";

export default function AIToolbar({ onSummarize, onProofread, aiFeedback, onShowGuide, onSubmit, submitting, submitted, saveStatus, onClearFeedback }) {
  const [activeTool, setActiveTool] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleToolClick = (tool, callback) => {
    setActiveTool(tool);
    callback();
    // Always show feedback popup when a tool is clicked
    setShowFeedback(true);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button 
          className={`toolbar-btn ${activeTool === 'summarize' ? 'active' : ''}`}
          onClick={() => handleToolClick('summarize', onSummarize)}
        >
          🧠 Summarize
        </button>
        <button 
          className={`toolbar-btn ${activeTool === 'proofread' ? 'active' : ''}`}
          onClick={() => handleToolClick('proofread', onProofread)}
        >
          ✍️ Proofread
        </button>
        {/* AI feedback text - only show when there's actual feedback */}
        {aiFeedback && (
          <div 
            className="ai-suggestions-text clickable"
            onClick={() => setShowFeedback(!showFeedback)}
            style={{ cursor: 'pointer' }}
          >
            ⚡ AI Feedback Available
          </div>
        )}
        
        {/* Help button */}
        <div className="toolbar-divider"></div>
        <button 
          className="toolbar-btn help-btn"
          onClick={onShowGuide}
          title="Show writing guide"
        >
          ❓ Help
        </button>
      </div>

      <div className="toolbar-right">
        {/* Project Status */}
        <div className="submission-status">
          {saveStatus || "Ready"}
        </div>
        
        {/* Debug: Show if saveStatus is received */}
        {console.log('AIToolbar received saveStatus:', saveStatus)}
        
        {/* Submit Button */}
        {onSubmit && (
          <button
            onClick={onSubmit}
            disabled={submitting || submitted}
            className="submit-button-toolbar"
          >
            {submitting ? "Submitting..." : submitted ? "✅ Submitted" : "📤 Submit"}
          </button>
        )}
        
      </div>
      
      {/* AI Feedback Popup - Gaming Style */}
      {aiFeedback && showFeedback && (
        <div className="ai-feedback-popup-gaming">
          <div className="ai-feedback-header">
            <span className="ai-feedback-title">⚡ AI Feedback</span>
            <div className="ai-feedback-actions">
              {onClearFeedback && (
                <button 
                  className="clear-feedback-gaming"
                  onClick={() => {
                    onClearFeedback();
                    setShowFeedback(false);
                  }}
                  title="Clear feedback"
                >
                  🗑️ Clear
                </button>
              )}
              <button 
                className="close-feedback-gaming"
                onClick={() => setShowFeedback(false)}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="ai-feedback-content-gaming">
            {typeof aiFeedback === "string" ? aiFeedback : JSON.stringify(aiFeedback)}
          </div>
        </div>
      )}
    </div>
  );
}