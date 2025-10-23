// src/components/TextEditor/AIToolbar.jsx
import React, { useState } from "react";

export default function AIToolbar({ onSummarize, onProofread, onShowGuide, onSubmit, submitting, submitted, saveStatus }) {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolClick = (tool, callback) => {
    setActiveTool(tool);
    callback();
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
            {submitting ? "Submitting..." : submitted ? "✅ Submitted" : "Submit"}
          </button>
        )}
        
      </div>
    </div>
  );
}