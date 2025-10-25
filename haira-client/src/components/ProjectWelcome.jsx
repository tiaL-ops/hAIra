import React from 'react';
import '../styles/ProjectWelcome.css';

export default function ProjectWelcome({ project, onContinue }) {
  return (
    <div className="project-welcome-overlay">
      <div className="project-welcome-modal">
        <div className="welcome-header">
          <h1 className="welcome-title">🎉 Project Created!</h1>
        </div>
        
        <div className="welcome-content">
          <div className="project-title-display">
            <h2>{project?.title || 'Your New Project'}</h2>
          </div>
          
          {project?.description && (
            <div className="project-description">
              <p>{project.description}</p>
            </div>
          )}
          
          <div className="next-steps">
            <h3>📋 Next Steps:</h3>
            <ol>
              <li>✨ Choose your AI teammates</li>
              <li>💬 Start collaborating in team chat</li>
              <li>📊 Manage tasks on Kanban board</li>
              <li>📝 Submit your final project</li>
            </ol>
          </div>
          
          <div className="welcome-actions">
            <button 
              className="btn-continue-setup"
              onClick={onContinue}
            >
              Continue to Choose Teammates →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
