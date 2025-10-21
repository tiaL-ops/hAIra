// src/components/SummaryReflection.jsx
import React, { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../../firebase.js';
import axios from 'axios';

const backend_host = "http://localhost:3002";

export default function SummaryReflection({ projectId, reportContent, aiSummary }) {
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState("Auto-saving…");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load existing reflection on mount
  useEffect(() => {
    const loadReflection = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        
        // Get project data from backend
        const token = await getIdTokenSafely();
        const response = await axios.get(`${backend_host}/api/project/${projectId}/submission`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const projectData = response.data.project;
        if (projectData?.finalReflection) {
          setReflection(projectData.finalReflection);
        }
      } catch (err) {
        console.error("Error loading reflection:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReflection();
  }, [projectId]);

  // Auto-save effect
  useEffect(() => {
    if (!reflection.trim() || !projectId) return;

    const timeout = setTimeout(async () => {
      try {
        setStatus("Saving...");
        const token = await getIdTokenSafely();
        
        await axios.post(`${backend_host}/api/project/${projectId}/submission/draft`, 
          { 
            content: reflection,
            type: 'reflection'
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
          }
        );
        
        setStatus("Saved ✓");
      } catch (err) {
        setStatus("Save failed");
        console.error("Reflection save error", err);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [reflection, projectId]);

  // Generate AI reflection when report content changes
  const generateAIReflection = async () => {
    if (!reportContent.trim()) {
      alert("Please write some content in the report first.");
      return;
    }

    setIsGenerating(true);
    try {
      const token = await getIdTokenSafely();
      const res = await axios.post(`${backend_host}/api/project/${projectId}/ai/reflect`, {
        content: reportContent
      }, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      const data = res.data;
      
      if (data.success && data.reflection) {
        setReflection(data.reflection);
        setStatus("AI Reflection Generated ✓");
      } else {
        setStatus("Failed to generate reflection");
      }
    } catch (err) {
      console.error("AI Reflection error", err);
      setStatus("AI error: " + err.message);
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="summary-reflection-container">
      <div className="summary-header">
        <h3>🪞 Summary & Reflection</h3>
        <div className="reflection-stats">
          <button 
            className="generate-reflection-btn"
            onClick={generateAIReflection}
            disabled={isGenerating || !reportContent.trim()}
          >
            {isGenerating ? "🤖 Generating..." : "🤖 Generate AI Reflection"}
          </button>
          <span className={`save-status ${status.includes('✓') ? 'saved' : status.includes('failed') ? 'error' : 'saving'}`}>
            {isLoading ? 'Loading...' : status}
          </span>
        </div>
      </div>
      
      <div className="reflection-wrapper">
        <div className="ai-summary-section">
          <h4>📝 AI Summary</h4>
          <div className="ai-summary-content">
            {aiSummary ? aiSummary : "Click '🧠 Summarize' in the toolbar to generate an AI summary of your report."}
          </div>
        </div>
        
        <div className="ai-reflection-section">
          <h4>🤖 AI Reflection</h4>
          <div className="reflection-content">
            {reflection ? reflection : "Click '🤖 Generate AI Reflection' to create an AI-powered reflection on your project."}
          </div>
        </div>
        
        <div className="reflection-footer">
          <div className="reflection-tips">
            💡 AI will analyze your report and generate insights about lessons learned, challenges faced, and areas for improvement.
          </div>
        </div>
      </div>
    </div>
  );
}