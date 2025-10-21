// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';

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
        <h3>📊 Contribution Tracker</h3>
        <div className="total-contribution">
          Total: {totalContribution}%
          {totalContribution !== 100 && (
            <span className="warning">⚠️ Should equal 100%</span>
          )}
        </div>
      </div>
      
      <div className="contributions-list">
        {contributions.map((member, index) => (
          <div key={index} className="contribution-item">
            <div className="member-info">
              <div className="member-name">
                <span className="member-avatar">
                  {member.name === 'You' ? '👤' : member.name.includes('AI') ? '🤖' : '👥'}
                </span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
              </div>
              <div className="contribution-controls">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={member.percent}
                  onChange={(e) => updateContribution(index, parseInt(e.target.value) || 0)}
                  className="contribution-input"
                />
                <span className="percent-label">%</span>
              </div>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${member.percent}%`,
                  backgroundColor: getContributionColor(index)
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="tracker-footer">
        <div className="tracker-tips">
          💡 Adjust percentages to reflect actual contribution to the project
        </div>
      </div>
    </div>
  );
}