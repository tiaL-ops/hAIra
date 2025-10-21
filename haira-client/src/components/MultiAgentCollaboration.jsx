// src/components/MultiAgentCollaboration.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';

const backend_host = "http://localhost:3002";

export default function MultiAgentCollaboration({ projectId, reportContent, onContentUpdate }) {
  const [lalaResponse, setLalaResponse] = useState("");
  const [minoResponse, setMinoResponse] = useState("");
  const [isLalaTyping, setIsLalaTyping] = useState(false);
  const [isMinoTyping, setIsMinoTyping] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);

  // Auto-trigger AI responses when content changes significantly
  useEffect(() => {
    if (!reportContent.trim() || reportContent.length < 50) return;

    const timeout = setTimeout(() => {
      triggerAICollaboration();
    }, 3000); // Wait 3 seconds after user stops typing

    return () => clearTimeout(timeout);
  }, [reportContent]);

  const triggerAICollaboration = async () => {
    if (!reportContent.trim()) return;

    // Trigger both AI personas
    await Promise.all([
      getLalaResponse(),
      getMinoResponse()
    ]);
  };

  const getLalaResponse = async () => {
    try {
      setIsLalaTyping(true);
      const token = await getIdTokenSafely();
      
      const response = await axios.post(`${backend_host}/api/project/${projectId}/ai/respond`, {
        prompt: `Please review this project content and provide feedback: ${reportContent}`,
        persona: 'lala'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setLalaResponse(response.data.response);
        setShowCollaboration(true);
      }
    } catch (err) {
      console.error("Lala response error:", err);
    } finally {
      setIsLalaTyping(false);
    }
  };

  const getMinoResponse = async () => {
    try {
      setIsMinoTyping(true);
      const token = await getIdTokenSafely();
      
      const response = await axios.post(`${backend_host}/api/project/${projectId}/ai/respond`, {
        prompt: `What do you think about this project content: ${reportContent}`,
        persona: 'mino'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setMinoResponse(response.data.response);
        setShowCollaboration(true);
      }
    } catch (err) {
      console.error("Mino response error:", err);
    } finally {
      setIsMinoTyping(false);
    }
  };

  const handleManualTrigger = () => {
    triggerAICollaboration();
  };

  const handleApplyLalaSuggestion = () => {
    // This would integrate Lala's feedback into the content
    // For now, just show a message
    alert("Lala's suggestions would be applied here. This feature can be extended to parse and apply specific suggestions.");
  };

  const handleApplyMinoSuggestion = () => {
    // This would integrate Mino's feedback into the content
    alert("Mino's suggestions would be applied here. This feature can be extended to parse and apply specific suggestions.");
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

  if (!showCollaboration && !isLalaTyping && !isMinoTyping) {
    return (
      <div className="multi-agent-trigger">
        <button 
          className="collaboration-trigger-btn"
          onClick={handleManualTrigger}
          disabled={!reportContent.trim()}
        >
          🤖 Get AI Collaboration
        </button>
      </div>
    );
  }

  return (
    <div className="multi-agent-collaboration">
      <div className="collaboration-header">
        <h3>🤖 AI Team Collaboration</h3>
        <button 
          className="close-collaboration-btn"
          onClick={() => setShowCollaboration(false)}
        >
          ✕
        </button>
      </div>

      <div className="ai-responses">
        {/* Lala (Manager AI) */}
        <div className="ai-response lala-response">
          <div className="ai-header">
            <div className="ai-avatar">👩‍💼</div>
            <div className="ai-info">
              <strong>Lala</strong>
              <span>AI Manager</span>
            </div>
            {isLalaTyping && <div className="typing-indicator">💭 Thinking...</div>}
          </div>
          
          {lalaResponse && (
            <div className="ai-content">
              <p>{lalaResponse}</p>
              <button 
                className="apply-suggestion-btn"
                onClick={handleApplyLalaSuggestion}
              >
                Apply Lala's Suggestions
              </button>
            </div>
          )}
        </div>

        {/* Mino (Slacker AI) */}
        <div className="ai-response mino-response">
          <div className="ai-header">
            <div className="ai-avatar">😴</div>
            <div className="ai-info">
              <strong>Mino</strong>
              <span>AI Helper</span>
            </div>
            {isMinoTyping && <div className="typing-indicator">💭 Thinking...</div>}
          </div>
          
          {minoResponse && (
            <div className="ai-content">
              <p>{minoResponse}</p>
              <button 
                className="apply-suggestion-btn"
                onClick={handleApplyMinoSuggestion}
              >
                Apply Mino's Suggestions
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="collaboration-footer">
        <button 
          className="refresh-collaboration-btn"
          onClick={handleManualTrigger}
          disabled={isLalaTyping || isMinoTyping}
        >
          🔄 Refresh AI Responses
        </button>
      </div>
    </div>
  );
}
