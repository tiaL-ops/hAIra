import React, { useState } from 'react';

const TASK_TYPES = {
  WRITE_SECTION: 'write_section',
  REVIEW: 'review',
  SUGGEST_IMPROVEMENTS: 'suggest_improvements'
};

const AI_TEAMMATES = {
  ai_manager: {
    id: 'ai_manager',
    name: 'Alex (Project Manager)',
    emoji: '🧠',
    color: '#4A90E2',
    description: 'Organized & deadline-focused'
  },
  ai_helper: {
    id: 'ai_helper',
    name: 'Sam (Helper)',
    emoji: '😴',
    color: '#93C263',
    description: 'Lazy & creative'
  }
};

export default function TeamPanel({ onAssignTask, loadingAIs = new Set(), teamMembers = [] }) {
  const [showTaskMenu, setShowTaskMenu] = useState(null);
  const [sectionName, setSectionName] = useState('');

  const handleAIClick = (aiType) => {
    console.log('TeamPanel handleAIClick called:', { aiType });
    setShowTaskMenu(aiType);
  };

  const handleTaskSelect = (aiType, taskType) => {
    console.log('TeamPanel handleTaskSelect called:', { aiType, taskType, sectionName });
    onAssignTask(aiType, taskType, sectionName);
    setShowTaskMenu(null);
    setSectionName('');
  };

  const getTaskTypeLabel = (taskType) => {
    switch (taskType) {
      case TASK_TYPES.WRITE_SECTION:
        return '✍️ Write Section';
      case TASK_TYPES.REVIEW:
        return '👀 Review';
      case TASK_TYPES.SUGGEST_IMPROVEMENTS:
        return '💡 Suggest Improvements';
      default:
        return taskType;
    }
  };

  const getAITeammate = (memberId) => {
    return AI_TEAMMATES[memberId] || null;
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
        <h3>🤖 AI Team Tasks</h3>
        <p>Assign tasks to your AI teammates</p>
      </div>

      <div className="ai-teammates">
        {aiTeammates.map((teammate) => (
          <div key={teammate.id} className="ai-teammate">
            <div 
              className="ai-teammate-card"
              style={{ borderColor: teammate.color }}
              onClick={() => handleAIClick(teammate.id)}
            >
              <div className="ai-avatar" style={{ backgroundColor: teammate.color }}>
                {teammate.emoji}
              </div>
              <div className="ai-info">
                <h4>{teammate.name}</h4>
                <p>{teammate.description}</p>
                <span className="ai-role">{teammate.role}</span>
              </div>
              <div className="ai-status">
                {loadingAIs.has(teammate.id) ? '⏳' : '✅'}
              </div>
            </div>

            {/* Task Menu */}
            {showTaskMenu === teammate.id && (
              <div className="task-menu">
                <div className="task-menu-header">
                  <h4>Assign Task to {teammate.name}</h4>
                  <button 
                    className="close-menu"
                    onClick={() => setShowTaskMenu(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="section-input">
                  <label>Section Name (optional):</label>
                  <input
                    type="text"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="e.g., Introduction, Conclusion"
                  />
                </div>

                <div className="task-options">
                  <button
                    className="task-option"
                    onClick={() => handleTaskSelect(teammate.id, TASK_TYPES.WRITE_SECTION)}
                    disabled={loadingAIs.has(teammate.id)}
                  >
                    {getTaskTypeLabel(TASK_TYPES.WRITE_SECTION)}
                  </button>
                  
                  <button
                    className="task-option"
                    onClick={() => handleTaskSelect(teammate.id, TASK_TYPES.REVIEW)}
                    disabled={loadingAIs.has(teammate.id)}
                  >
                    {getTaskTypeLabel(TASK_TYPES.REVIEW)}
                  </button>
                  
                  <button
                    className="task-option"
                    onClick={() => handleTaskSelect(teammate.id, TASK_TYPES.SUGGEST_IMPROVEMENTS)}
                    disabled={loadingAIs.has(teammate.id)}
                  >
                    {getTaskTypeLabel(TASK_TYPES.SUGGEST_IMPROVEMENTS)}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {aiTeammates.length === 0 && (
        <div className="no-ai-teammates">
          <p>No AI teammates found. They will be added automatically.</p>
        </div>
      )}
    </div>
  );
}
