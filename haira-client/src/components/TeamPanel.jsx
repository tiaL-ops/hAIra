import React, { useState } from 'react';
import { AI_TEAMMATES, TASK_TYPES } from '../../../haira-server/config/aiAgents.js';
import TaskAssignmentModal from './TaskAssignmentModal';

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

export default function TeamPanel({ onAssignTask, loadingAIs = new Set(), teamMembers = [] }) {
  const [selectedTeammate, setSelectedTeammate] = useState(null);

  // Avatar mapping
  const avatarMap = {
    brown: BrownAvatar,
    elza: ElzaAvatar,
    kati: KatiAvatar,
    steve: SteveAvatar,
    sam: SamAvatar,
    rasoa: RasoaAvatar,
    rakoto: RakotoAvatar
  };

  // Get appropriate avatar for AI teammates
  const getAIAvatar = (teammate) => {
    const avatarSrc = avatarMap[teammate.id];
    if (avatarSrc) {
      return (
        <img 
          src={avatarSrc} 
          alt={teammate.name}
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2px solid ${teammate.color || '#666'}`
          }}
        />
      );
    }
    // Fallback to initial letter if no image found
    return (
      <div 
        style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '50%',
          backgroundColor: teammate.color || '#666',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '18px'
        }}
      >
        {teammate.name ? teammate.name.charAt(0).toUpperCase() : '?'}
      </div>
    );
  };

  const handleAIClick = (teammate) => {
    console.log('TeamPanel handleAIClick called:', { teammate });
    setSelectedTeammate(teammate);
  };

  const handleAssignTask = (aiType, taskType, sectionName) => {
    console.log('🎯 TeamPanel: Task assignment initiated');
    console.log('📋 TeamPanel handleAssignTask called:', { aiType, taskType, sectionName });
    
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
    
    console.log('🔄 TeamPanel: Mapped task type:', mappedTaskType);
    console.log('📤 TeamPanel: Calling onAssignTask with:', { aiType, mappedTaskType, sectionName });
    
    onAssignTask(aiType, mappedTaskType, sectionName);
    setSelectedTeammate(null);
  };

  const handleCloseModal = () => {
    setSelectedTeammate(null);
  };


  const getAITeammate = (memberId) => {
    // Map memberId to AI_TEAMMATES - supports new 5-agent team and legacy IDs
    if (AI_TEAMMATES[memberId]) {
      return AI_TEAMMATES[memberId];
    }
    // Legacy mapping
    if (memberId === 'ai_manager' || memberId === 'rasoa') {
      return AI_TEAMMATES.brown;
    } else if (memberId === 'ai_helper' || memberId === 'rakoto') {
      return AI_TEAMMATES.sam;
    }
    return null;
  };

  // Filter AI teammates from team members, or use default teammates for testing
  const aiTeammates = teamMembers.length > 0 
    ? teamMembers
        .filter(member => member.type === 'ai')
        .map(member => ({
          ...getAITeammate(member.id),
          id: member.id, // Ensure id is preserved
          type: 'ai'
        }))
    : [
        // Default AI teammates for testing - include all available teammates
        { id: 'brown', type: 'ai', ...AI_TEAMMATES.brown },
        { id: 'elza', type: 'ai', ...AI_TEAMMATES.elza },
      ];

  // Debug: Log the AI teammates being created
  console.log('🔍 TeamPanel: aiTeammates created:', aiTeammates);
  console.log('🔍 TeamPanel: AI_TEAMMATES keys:', Object.keys(AI_TEAMMATES));

  return (
    <div className="team-panel">
      <div className="team-panel-header">
        <div className="header-text">
          <h3>Assign tasks to teammates</h3>
          {teamMembers.length === 0 && (
            <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
              Default AI teammates for testing
            </p>
          )}
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
          <p>No AI teammates found. Default teammates are being loaded for testing.</p>
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
