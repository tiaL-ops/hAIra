// src/components/ContributionTracker.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function ContributionTracker({ projectId }) {
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContribution, setTotalContribution] = useState(0);

  // Load contributions from Firestore
  useEffect(() => {
    const loadContributions = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const docRef = doc(db, "userProjects", projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.contributions) {
            setContributions(data.contributions);
            const total = data.contributions.reduce((sum, c) => sum + c.percent, 0);
            setTotalContribution(total);
          } else {
            // Initialize with default data if none exists
            const defaultContributions = [
              { name: "You", percent: 0, role: "Student" },
              { name: "AI Alex", percent: 0, role: "AI Manager" },
              { name: "AI Assistant", percent: 0, role: "AI Helper" },
            ];
            setContributions(defaultContributions);
            await setDoc(docRef, { contributions: defaultContributions }, { merge: true });
          }
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
      await setDoc(doc(db, "userProjects", projectId), {
        contributions: updated,
        contributionUpdatedAt: Date.now(),
      }, { merge: true });
      
      const total = updated.reduce((sum, c) => sum + c.percent, 0);
      setTotalContribution(total);
    } catch (err) {
      console.error("Error updating contribution:", err);
    }
  };

  const getContributionColor = (index) => {
    const colors = ['var(--color-teal)', 'var(--color-purple)', 'var(--color-red)', 'var(--color-green)'];
    return colors[index % colors.length];
  };

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