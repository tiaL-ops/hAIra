import React, { useState, useEffect } from 'react';
import { getAIAgents } from '../services/aiAgentsService.js';
import '../styles/TaskAssignmentModal.css';

// Using emoji from agent config instead of images

const TaskAssignmentModal = ({ 
  isOpen, 
  onClose, 
  aiTeammate, 
  onAssignTask, 
  isLoading 
}) => {
  const [sectionName, setSectionName] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('write');

  // Get the correct avatar based on AI teammate
  const getAvatar = (aiTeammate) => {
    // Use emoji from teammate config
    return aiTeammate.emoji || aiTeammate.avatar || '🤖';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sectionName.trim() && selectedTaskType === 'write') return;
    
    // Debug: Log the aiTeammate object and its id
    console.log('🔍 TaskAssignmentModal: aiTeammate object:', aiTeammate);
    console.log('🔍 TaskAssignmentModal: aiTeammate.id:', aiTeammate.id);
    console.log('🔍 TaskAssignmentModal: selectedTaskType:', selectedTaskType);
    console.log('🔍 TaskAssignmentModal: sectionName:', sectionName.trim());
    
    onAssignTask(aiTeammate.id, selectedTaskType, sectionName.trim());
    setSectionName('');
    setSelectedTaskType('write');
    onClose();
  };

  const handleClose = () => {
    setSectionName('');
    setSelectedTaskType('write');
    onClose();
  };

  const taskTypes = [
    { id: 'write', label: '✍️ Write Section', description: 'Generate new content' },
    { id: 'review', label: '👀 Review', description: 'Review existing content' },
    { id: 'suggest', label: '💡 Suggest Improvements', description: 'Suggest enhancements' }
  ];

  if (!isOpen) return null;

  return (
    <div className="task-modal-overlay" onClick={handleClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-modal-header">
          <h3>Assign Task to {aiTeammate.name}</h3>
          <button 
            className="task-modal-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="task-modal-body">
          <div className="ai-teammate-info">
            <div className="ai-teammate-avatar" style={{ backgroundColor: aiTeammate.color }}>
              <span className="ai-avatar-emoji">{getAvatar(aiTeammate)}</span>
            </div>
            <div className="ai-teammate-details">
              <h4>{aiTeammate.name}</h4>
              <p className="ai-teammate-role">{aiTeammate.role}</p>
              <p className="ai-teammate-personality">{aiTeammate.personality}</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="task-assignment-form">
            <div className="form-group">
              <label>Task Type:</label>
              <div className="task-type-options">
                {taskTypes.map((taskType) => (
                  <label key={taskType.id} className="task-type-option">
                    <input
                      type="radio"
                      name="taskType"
                      value={taskType.id}
                      checked={selectedTaskType === taskType.id}
                      onChange={(e) => setSelectedTaskType(e.target.value)}
                    />
                    <div className="task-type-content">
                      <span className="task-type-label">{taskType.label}</span>
                      <span className="task-type-description">{taskType.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sectionName">Section Name (optional):</label>
              <input
                id="sectionName"
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g., Introduction, Conclusion"
                autoFocus
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isLoading || (selectedTaskType === 'write' && !sectionName.trim())}
              >
                {isLoading ? 'Assigning...' : `Assign ${taskTypes.find(t => t.id === selectedTaskType)?.label || 'Task'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;
