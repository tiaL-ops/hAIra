// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';
// Using emoji from agent config instead of images
import '../styles/ContributionTracker.css';

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

  // Load word contributions from backend API
  useEffect(() => {
    const loadWordContributions = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const token = await getIdTokenSafely();
        
        // First, calculate user word count from current content if available
        if (editorContent) {
          await calculateUserWordCount(editorContent);
        }
        
        const response = await axios.get(`${backend_host}/api/project/${projectId}/word-contributions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const wordContributions = response.data.wordContributions;
          
          // Convert wordContributions to the format expected by the component
          const contributions = [
            {
              name: "You",
              percent: wordContributions.user.percentage,
              role: "Student",
              wordCount: wordContributions.user.words
            }
          ];
          
          // Add all AI teammates dynamically
          const aiAgentIds = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];
          aiAgentIds.forEach(agentId => {
            if (wordContributions[agentId] && AI_TEAMMATES[agentId]) {
              contributions.push({
                name: AI_TEAMMATES[agentId].name,
                percent: wordContributions[agentId].percentage,
                role: AI_TEAMMATES[agentId].role,
                wordCount: wordContributions[agentId].words
              });
            }
          });
          
          setContributions(contributions);
          setTotalContribution(response.data.totalWords);
        }
      } catch (err) {
        console.error("Error loading word contributions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWordContributions();
  }, [projectId, editorContent]);


  // Utility to get token
  async function getIdTokenSafely() {
    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      if (auth && auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch (err) {
      // ignore; return null
    }
    return null;
  }

  const getContributionColor = (index) => {
    const colors = ['var(--color-teal)', 'var(--color-purple)', 'var(--color-red)', 'var(--color-green)'];
    return colors[index % colors.length];
  };

  //Get Avatar dynamically
  const getMemberAvatar = (member) => {
    if (member.name === 'You') {
      return '👤';
    }
    // Check if member matches any AI teammate by name
    const aiAgent = Object.values(AI_TEAMMATES).find(agent => agent.name === member.name);
    if (aiAgent) {
      return aiAgent.emoji;
    }
    return '🤖';
  };

  const getMemberColor = (member) => {
    // Check if member matches any AI teammate by name
    const aiAgent = Object.values(AI_TEAMMATES).find(agent => agent.name === member.name);
    if (aiAgent) {
      return aiAgent.color;
    }
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
                    <img 
                      src={getMemberAvatar(member)} 
                      alt={`${member.name} avatar`}
                      className="ai-avatar-image"
                    />
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