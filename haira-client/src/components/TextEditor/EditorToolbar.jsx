// src/components/TextEditor/EditorToolbar.jsx
import React, { useState } from "react";

export default function EditorToolbar({ onSummarize, onProofread, onSuggest, aiFeedback }) {
  const [activeTool, setActiveTool] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleToolClick = (tool, callback) => {
    setActiveTool(tool);
    callback();
    if (aiFeedback) {
      setShowFeedback(true);
    }
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
        <button 
          className={`toolbar-btn ${activeTool === 'suggest' ? 'active' : ''}`}
          onClick={() => handleToolClick('suggest', onSuggest)}
        >
          💡 Suggest
        </button>
      </div>

      <div className="toolbar-right">
        {aiFeedback ? (
          <div className="ai-feedback-container">
            <button 
              className="ai-feedback-toggle"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              ⚡ AI Feedback {showFeedback ? '▼' : '▶'}
            </button>
            {showFeedback && (
              <div className="ai-feedback-popup">
                <div className="ai-feedback-content">
                  {typeof aiFeedback === "string" ? aiFeedback : JSON.stringify(aiFeedback)}
                </div>
                <button 
                  className="close-feedback"
                  onClick={() => setShowFeedback(false)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ai-feedback-placeholder">
            AI suggestions will appear here
          </div>
        )}
      </div>
    </div>
  );
}