// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { AI_TEAMMATES } from '../../../shared/aiReportAgents.js';
// Use public folder for images to avoid import issues
import AlexAvatar from '../images/Alex.png';
import SamAvatar from '../images/Sam.png';
import '../styles/ContributionTracker.css';

const backend_host = "http://localhost:3002";

export default function ContributionTracker({ projectId, showContributions = true }) {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContribution, setTotalContribution] = useState(0);

  // Load contributions from backend API
  useEffect(() => {
    const loadContributions = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const token = await getIdTokenSafely();
        
        const response = await axios.get(`${backend_host}/api/project/${projectId}/contributions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setContributions(response.data.contributions);
          setTotalContribution(response.data.totalContribution);
        }
      } catch (err) {
        console.error("Error loading contributions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadContributions();
  }, [projectId]);

  const updateContribution = async (index, newPercent) => {
    const updated = [...contributions];
    updated[index].percent = Math.max(0, Math.min(100, newPercent));
    setContributions(updated);
    
    try {
      const token = await getIdTokenSafely();
      const response = await axios.post(`${backend_host}/api/project/${projectId}/contributions`, {
        contributions: updated
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setTotalContribution(response.data.totalContribution);
      }
    } catch (err) {
      console.error("Error updating contribution:", err);
    }
  };

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

  const getMemberAvatar = (member) => {
    if (member.name === 'You') {
      return '👤';
    }
    
    // Check if it's an AI teammate
    if (member.name === AI_TEAMMATES.MANAGER.name || member.name === 'Alex') {
      return AlexAvatar;
    } else if (member.name === AI_TEAMMATES.LAZY.name || member.name === 'Sam') {
      return SamAvatar;
    }
    
    // Fallback for other AI members
    return '🤖';
  };

  const getMemberColor = (member) => {
    if (member.name === AI_TEAMMATES.MANAGER.name) {
      return AI_TEAMMATES.MANAGER.color;
    } else if (member.name === AI_TEAMMATES.LAZY.name) {
      return AI_TEAMMATES.LAZY.color;
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
      <div className="tracker-header">
        <div className="header-title">
          <h2>Team Contributions</h2>
          <div className="tracker-subheader">
            <h3>📊 Contribution Tracker</h3>
            <div className="total-contribution">
              Total: {totalContribution}%
              {totalContribution !== 100 && (
                <span className="warning">⚠️ Should equal 100%</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="contributions-list">
        {contributions.map((member, index) => (
          <div key={index} className="contribution-item">
            <div className="member-info">
              <div className="member-name">
                <div className="member-avatar">
                  {typeof getMemberAvatar(member) === 'string' ? (
                    <span className="avatar-emoji">{getMemberAvatar(member)}</span>
                  ) : (
                    <img 
                      src={getMemberAvatar(member)} 
                      alt={`${member.name} avatar`}
                      className="avatar-image"
                    />
                  )}
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
              </div>
              <div className="contribution-controls">
                <div className="contribution-display">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={member.percent}
                    onChange={(e) => updateContribution(index, parseInt(e.target.value) || 0)}
                    className="percent-input"
                  />
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
      
      <div className="tracker-footer">
        <div className="tracker-tips">
          💡 Contributions are automatically calculated based on word count in the final report
        </div>
      </div>
    </div>
  );
}