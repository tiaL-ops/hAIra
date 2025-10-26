// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { auth } from '../../firebase';
import { isFirebaseAvailable } from '../services/localStorageService';
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

const backend_host = "http://localhost:3002";

export default function ContributionTracker({ projectId, showContributions = true, editorContent = '' }) {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContribution, setTotalContribution] = useState(0);

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
      
      console.log("User word count calculated successfully");
    } catch (err) {
      console.error("Error calculating user word count:", err);
    }
  };

  // Load real-time contributions from backend API
  useEffect(() => {
    const loadRealTimeContributions = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const token = await getIdTokenSafely();
        
        // First, calculate user word count from current content if available
        if (editorContent) {
          await calculateUserWordCount(editorContent);
        }
        
        // Use the new real-time contributions endpoint
        const response = await axios.get(`${backend_host}/api/project/${projectId}/contributions/realtime`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const contributionsData = response.data.contributions;
          
          // Convert the new format to the format expected by the component
          const contributions = contributionsData.map(contributor => ({
            name: contributor.name,
            percent: contributor.percentage,
            role: contributor.role,
            wordCount: contributor.words,
            color: contributor.color
          }));
          
          setContributions(contributions);
          setTotalContribution(response.data.totalWords);
        }
      } catch (err) {
        console.error("Error loading real-time contributions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRealTimeContributions();
  }, [projectId, editorContent]);


  // Utility to get token
  async function getIdTokenSafely() {
    try {
      const firebaseAvailable = isFirebaseAvailable();
      if (firebaseAvailable) {
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
    const aiAgent = Object.values(AI_TEAMMATES).find(agent => agent.name === member.name);
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
    const aiAgent = Object.values(AI_TEAMMATES).find(agent => agent.name === member.name);
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

  if (isLoading) {
    return (
      <div className="contribution-tracker-container">
        <h3>📊 Contribution Tracker</h3>
        <div className="loading-state">Loading contributions...</div>
      </div>
    );
  }

  return (
    <div className="contribution-tracker-container">
      
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
                <div className="word-count">
                  <span className="word-count-label">{member.wordCount || 0} words</span>
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
          </div>
        ))}
      </div>
      
      <div className="tracker-tips">
        <span className="tip-item">💡 Word-based contributions</span>
        <span className="tip-item">📝 Auto-tracked when AI writes</span>
      </div>image.png
    </div>
  );
}