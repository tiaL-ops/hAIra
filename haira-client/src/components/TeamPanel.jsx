import React, { useState } from 'react';
import { AI_TEAMMATES, TASK_TYPES } from '../../../shared/aiReportAgents.js';
import TaskAssignmentModal from './TaskAssignmentModal';

import AlexAvatar from '../images/Alex.png';
import SamAvatar from '../images/Sam.png';

export default function TeamPanel({ onAssignTask, loadingAIs = new Set(), teamMembers = [] }) {
  const [selectedTeammate, setSelectedTeammate] = useState(null);

  // Get appropriate avatar for AI teammates
  const getAIAvatar = (teammate) => {
    if (teammate.id === 'ai_manager' || teammate.name === 'Alex') {
      return <img src={AlexAvatar} alt="Alex" className="team-avatar" />;
    }
    if (teammate.id === 'ai_helper' || teammate.name === 'Sam') {
      return <img src={SamAvatar} alt="Sam" className="team-avatar" />;
    }
    // Fallback to emoji for other teammates
    return teammate.emoji;
  };

  const handleAIClick = (teammate) => {
    console.log('TeamPanel handleAIClick called:', { teammate });
    setSelectedTeammate(teammate);
  };

  const handleAssignTask = (aiType, taskType, sectionName) => {
    console.log('TeamPanel handleAssignTask called:', { aiType, taskType, sectionName });
    // Map task type from modal to TASK_TYPES
    let mappedTaskType;
    switch (taskType) {
      case 'write':
        mappedTaskType = TASK_TYPES.WRITE_SECTION;
        break;
      case 'review':
        mappedTaskType = TASK_TYPES.REVIEW;
        break;
      case 'suggest':
        mappedTaskType = TASK_TYPES.SUGGEST_IMPROVEMENTS;
        break;
      default:
        mappedTaskType = TASK_TYPES.WRITE_SECTION;
    }
    
    onAssignTask(aiType, mappedTaskType, sectionName);
    setSelectedTeammate(null);
  };

  const handleCloseModal = () => {
    setSelectedTeammate(null);
  };


  const getAITeammate = (memberId) => {
    // Map memberId to the correct AI_TEAMMATES key
    if (memberId === 'ai_manager') {
      return AI_TEAMMATES.MANAGER;
    } else if (memberId === 'ai_helper') {
      return AI_TEAMMATES.LAZY;
    }
    return null;
  };

  // Filter AI teammates from team members
  const aiTeammates = teamMembers
    .filter(member => member.type === 'ai')
    .map(member => ({
      ...member,
      ...getAITeammate(member.id)
    }));

  return (
    <div className="team-panel">
      <div className="team-panel-header">
        <div className="team-icon">🤖</div>
        <div className="header-text">
          <h3>Assign tasks to teammates</h3>
        </div>
      </div>

      <div className="ai-teammates">
        {aiTeammates.map((teammate) => (
          <div key={teammate.id} className="ai-teammate">
            <div 
              className="ai-teammate-card"
              onClick={() => handleAIClick(teammate)}
            >
              <div className="ai-avatar">
                {getAIAvatar(teammate)}
              </div>
              <div className="ai-info">
                <h4>{teammate.name}</h4>
                <span className="ai-role">{teammate.role}</span>
              </div>
              <div className={`ai-status ${loadingAIs.has(teammate.id) ? 'loading' : 'completed'}`}>
                {loadingAIs.has(teammate.id) ? '⏳' : '✅'}
              </div>
            </div>

          </div>
        ))}
      </div>

      {aiTeammates.length === 0 && (
        <div className="no-ai-teammates">
          <p>No AI teammates found. They will be added automatically.</p>
        </div>
      )}

      {/* Task Assignment Modal */}
      {selectedTeammate && (
        <TaskAssignmentModal
          isOpen={!!selectedTeammate}
          onClose={handleCloseModal}
          aiTeammate={selectedTeammate}
          onAssignTask={handleAssignTask}
          isLoading={loadingAIs.has(selectedTeammate.id)}
        />
      )}
    </div>
  );
}
