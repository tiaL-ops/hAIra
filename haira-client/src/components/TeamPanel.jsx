import React, { useState, useEffect } from 'react';
import { getAIAgents } from '../services/aiAgentsService.js';
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
  const [aiAgents, setAiAgents] = useState({ AI_AGENTS: {}, AI_TEAMMATES: {}, TASK_TYPES: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAiAgents(agents);
      } catch (error) {
        console.error('Error loading AI agents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAIAgents();
  }, []);

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
    setSelectedTeammate(teammate);
  };

  const handleAssignTask = (aiType, taskType, sectionName) => {
    // Map task type from modal to TASK_TYPES
    let mappedTaskType;
    switch (taskType) {
      case 'write':
        mappedTaskType = aiAgents.TASK_TYPES.WRITE_SECTION;
        break;
      case 'review':
        mappedTaskType = aiAgents.TASK_TYPES.REVIEW;
        break;
      case 'suggest':
        mappedTaskType = aiAgents.TASK_TYPES.SUGGEST_IMPROVEMENTS;
        break;
      default:
        mappedTaskType = aiAgents.TASK_TYPES.WRITE_SECTION;
    }
    onAssignTask(aiType, mappedTaskType, sectionName);
    setSelectedTeammate(null);
  };

  const handleCloseModal = () => {
    setSelectedTeammate(null);
  };


  const getAITeammate = (memberId) => {
    // Map memberId to AI_TEAMMATES - supports new 5-agent team and legacy IDs
    if (aiAgents.AI_TEAMMATES[memberId]) {
      return aiAgents.AI_TEAMMATES[memberId];
    }
    // Legacy mapping
    if (memberId === 'ai_manager' || memberId === 'rasoa') {
      return aiAgents.AI_TEAMMATES.brown;
    } else if (memberId === 'ai_helper' || memberId === 'rakoto') {
      return aiAgents.AI_TEAMMATES.sam;
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
        { id: 'brown', type: 'ai', ...aiAgents.AI_TEAMMATES.brown },
        { id: 'elza', type: 'ai', ...aiAgents.AI_TEAMMATES.elza },
      ];

  if (loading) {
    return (
      <div className="team-panel">
        <div className="team-panel-header">
          <div className="header-text">
            <h3>Loading AI teammates...</h3>
          </div>
        </div>
      </div>
    );
  }

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
