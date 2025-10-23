// EditorGuide.jsx
import React, { useState } from 'react';

export default function EditorGuide({ isVisible, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Project Title",
      description: "Start with a clear, descriptive title for your project",
      example: "# My Amazing Project",
      tip: "Use Heading 1 for your main title"
    },
    {
      title: "Project Description", 
      description: "Provide an overview of what your project is about",
      example: "This project aims to solve...",
      tip: "Use regular paragraphs for descriptions"
    },
    {
      title: "Objectives",
      description: "List your main goals and what you want to achieve",
      example: "• Goal 1\n• Goal 2\n• Goal 3",
      tip: "Use bullet points for objectives"
    },
    {
      title: "Methodology",
      description: "Explain how you plan to approach the project",
      example: "## Methodology\n\nI will use...",
      tip: "Use headings to organize sections"
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="editor-guide-overlay">
      <div className="editor-guide">
        <div className="editor-guide-header">
          <h3>📝 Project Structure Guide</h3>
          <button onClick={onClose} className="close-guide">×</button>
        </div>
        
        <div className="editor-guide-content">
          <div className="guide-step">
            <h4>{steps[currentStep].title}</h4>
            <p>{steps[currentStep].description}</p>
            <div className="guide-example">
              <code>{steps[currentStep].example}</code>
            </div>
            <div className="guide-tip">
              💡 {steps[currentStep].tip}
            </div>
          </div>
          
          <div className="guide-navigation">
            <button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="nav-btn prev"
            >
              ← Previous
            </button>
            <span className="step-indicator">
              {currentStep + 1} of {steps.length}
            </span>
            <button 
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              className="nav-btn next"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
