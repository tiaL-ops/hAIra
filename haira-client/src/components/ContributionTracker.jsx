// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { auth, serverFirebaseAvailable } from '../../firebase';
import { getAIAgents } from '../services/aiAgentsService.js';
import '../styles/ContributionTracker.css';

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

const backend_host = import.meta.env.VITE_BACKEND_HOST;

export default function ContributionTracker({ projectId, showContributions = true, editorContent = '' }) {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContribution, setTotalContribution] = useState(0);
  const [aiAgents, setAiAgents] = useState({ AI_TEAMMATES: {} });
  const [agentsLoaded, setAgentsLoaded] = useState(false);

  // Load AI agents on mount
  useEffect(() => {
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAiAgents(agents);
        setAgentsLoaded(true);
      } catch (error) {
        console.error('Error loading AI agents:', error);
        setAgentsLoaded(true); // Still set to true to prevent infinite loading
      }
    };
    loadAIAgents();
  }, []);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate user word count from editor content
  const calculateUserWordCount = async (content) => {
    if (!projectId || !content) return;
    
    try {
      const token = await getIdTokenSafely();
      if (!token) return;
      
      await axios.post(`${backend_host}/api/project/${projectId}/word-contributions/calculate-user`, {
        content: content
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error("Error calculating user word count:", err);
    }
  };

  // Load interaction-based contributions from backend API
  useEffect(() => {
    const loadInteractionContributions = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const token = await getIdTokenSafely();
        
        // Use the new data-driven contributions endpoint
        const response = await axios.get(`${backend_host}/api/project/${projectId}/contributions/analysis`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const contributionsData = response.data.contributions;
          
          // Convert to the format expected by the component
          const contributions = contributionsData.map(contributor => ({
            name: contributor.name,
            percent: contributor.percentage,
            role: contributor.role,
            color: contributor.color,
            details: contributor.details
          }));
          
          setContributions(contributions);
          setTotalContribution(response.data.analysis?.scores?.userContributionScore + response.data.analysis?.scores?.aiContributionScore || 0);
        }
      } catch (err) {
        console.error("Error loading interaction contributions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInteractionContributions();
  }, [projectId]);


  // Utility to get token
  async function getIdTokenSafely() {
    try {
      if (serverFirebaseAvailable) {
        if (auth && auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      } else {
        // Fallback to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        if (currentUser) {
          return `mock-token-${currentUser.uid}-${Date.now()}`;
        }
      }
    } catch (err) {
      // Fallback to localStorage token on error
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      if (currentUser) {
        return `mock-token-${currentUser.uid}-${Date.now()}`;
      }
    }
    return null;
  }

  const getContributionColor = (index) => {
    const colors = ['var(--color-teal)', 'var(--color-purple)', 'var(--color-red)', 'var(--color-green)'];
    return colors[index % colors.length];
  };

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

  //Get Avatar dynamically
  const getMemberAvatar = (member) => {
    if (member.name === 'You') {
      return '👤';
    }
    
    // Check if member matches any AI teammate by name and get their avatar
    const aiAgent = Object.values(aiAgents.AI_TEAMMATES || {}).find(agent => agent.name === member.name);
    if (aiAgent) {
      const avatarSrc = avatarMap[aiAgent.name.toLowerCase()];
      if (avatarSrc) {
        return (
          <img 
            src={avatarSrc} 
            alt={`${member.name} avatar`}
            className="ai-avatar-image"
          />
        );
      }
      // Fallback to emoji if no image found
      return aiAgent.emoji;
    }
    return '🤖';
  };

  const getMemberColor = (member) => {
    // Use the color from the new real-time data if available
    if (member.color) {
      return member.color;
    }
    
    // Fallback to AI teammate color lookup
    const aiAgent = Object.values(aiAgents.AI_TEAMMATES || {}).find(agent => agent.name === member.name);
    if (aiAgent) {
      return aiAgent.color;
    }
    
    // Final fallback to default colors
    return getContributionColor(contributions.indexOf(member));
  };

  // Don't show contributions during submission phase
  if (!showContributions) {
    return null;
  }

  if (isLoading || !agentsLoaded) {
    return (
      <div className="contribution-tracker-container">
        <div className="loading-state">Loading contributions...</div>
      </div>
    );
  }

  return (
    <div className="contribution-tracker-container">
      <div className="grade-section-header">
        <h2>👥 Team Contributions</h2>
        <button 
          className="detailed-analysis-btn-small"
          onClick={() => setShowDetails(!showDetails)}
          title="View detailed contribution analysis"
        >
          {showDetails ? '− Hide Details' : '+ View Details'}
        </button>
      </div>
      <div className="grade-section">
        <div className="contributions-list">
        {contributions.map((member, index) => (
          <div key={index} className="contribution-item">
            <div className="member-info">
              <div className="member-name">
                <div className="member-avatar">
                  {getMemberAvatar(member)}
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
              </div>
              <div className="contribution-controls">
                <div className="contribution-display">
                  <span className="percent-value">{member.percent.toFixed(1)}</span>
                  <span className="percent-label">%</span>
                </div>
                <div className="interaction-count">
                  <span className="interaction-count-label">
                    {member.details?.tasksCompleted || '0 done/0 assigned tasks'} • {member.details?.chatParticipation || '0/0 chats'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${member.percent}%`,
                  backgroundColor: getMemberColor(member)
                }}
              />
            </div>
            
            {showDetails && member.details && (
              <div className="interaction-details">
                <h4>Contribution Breakdown:</h4>
                <div className="interaction-detail">
                  <span className="interaction-type">Task Participation</span>
                  <span className="interaction-points">{member.details.completionRate}</span>
                </div>
                <div className="interaction-detail">
                  <span className="interaction-type">Chat Participation Rate</span>
                  <span className="interaction-points">{member.details.chatRate}</span>
                </div>
                <div className="interaction-detail">
                  <span className="interaction-type">Task Status</span>
                  <span className="interaction-points">{member.details.tasksCompleted}</span>
                </div>
                <div className="interaction-detail">
                  <span className="interaction-type">Chat Activity</span>
                  <span className="interaction-points">{member.details.chatParticipation}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
        
        <div className="tracker-tips">
          <span className="tip-item">💡 Data-driven contributions</span>
          <span className="tip-item">📝 Based on task completion & chat participation</span>
          <span className="tip-item">🎯 Real project activity analysis</span>
        </div>
      </div>
    </div>
  );
}