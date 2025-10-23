// src/components/MultiAgentCollaboration.jsx
import React, { useState, useEffect } from "react";
import axios from 'axios';

const backend_host = "http://localhost:3002";

export default function MultiAgentCollaboration({ projectId, reportContent, onContentUpdate }) {
  const [alexResponse, setAlexResponse] = useState("");
  const [samResponse, setSamResponse] = useState("");
  const [isAlexTyping, setIsAlexTyping] = useState(false);
  const [isSamTyping, setIsSamTyping] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [applyingSuggestion, setApplyingSuggestion] = useState(null);
  const triggerAICollaboration = async () => {
    if (!reportContent.trim()) return;

    // Trigger both AI teammates
    await Promise.all([
      getAlexResponse(),
      getSamResponse()
    ]);
  };

  const getAlexResponse = async () => {
    try {
      setIsAlexTyping(true);
      const token = await getIdTokenSafely();
      
      const response = await axios.post(`${backend_host}/api/project/${projectId}/ai/respond`, {
        prompt: `Please review this project content and provide feedback: ${reportContent}`,
        persona: 'alex'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setAlexResponse(response.data.response);
        setShowCollaboration(true);
      }
    } catch (err) {
      console.error("Alex response error:", err);
    } finally {
      setIsAlexTyping(false);
    }
  };

  const getSamResponse = async () => {
    try {
      setIsSamTyping(true);
      const token = await getIdTokenSafely();
      
      const response = await axios.post(`${backend_host}/api/project/${projectId}/ai/respond`, {
        prompt: `What do you think about this project content: ${reportContent}`,
        persona: 'sam'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSamResponse(response.data.response);
        setShowCollaboration(true);
      }
    } catch (err) {
      console.error("Sam response error:", err);
    } finally {
      setIsSamTyping(false);
    }
  };

  const handleManualTrigger = () => {
    triggerAICollaboration();
  };

  const handleApplyAlexSuggestion = () => {
    if (!alexResponse) return;
    
    setApplyingSuggestion('alex');
    
    // Parse Alex's response for actionable suggestions
    const suggestions = parseAISuggestions(alexResponse, 'alex');
    if (suggestions.length > 0) {
      // Apply the first suggestion to the content
      const updatedContent = applySuggestionToContent(reportContent, suggestions[0]);
      onContentUpdate(updatedContent);
        setAlexResponse(""); // Clear the response after applying
    } else {
      // If no specific suggestions found, just add a note
      const note = "\n\n[Alex's Note: " + alexResponse + "]";
      onContentUpdate(reportContent + note);
      setAlexResponse("");
    }
    
    // Clear applying state after a short delay
    setTimeout(() => setApplyingSuggestion(null), 1000);
  };

  const handleApplySamSuggestion = () => {
    if (!samResponse) return;
    
    setApplyingSuggestion('sam');
    
    // Parse Sam's response for suggestions
    const suggestions = parseAISuggestions(samResponse, 'sam');
    if (suggestions.length > 0) {
      // Apply the first suggestion to the content
      const updatedContent = applySuggestionToContent(reportContent, suggestions[0]);
      onContentUpdate(updatedContent);
      setSamResponse(""); // Clear the response after applying
    } else {
      // If no specific suggestions found, just add a note
      const note = "\n\n[Sam's Note: " + samResponse + "]";
      onContentUpdate(reportContent + note);
      setSamResponse("");
    }
    
    // Clear applying state after a short delay
    setTimeout(() => setApplyingSuggestion(null), 1000);
  };

  // Parse AI response for actionable suggestions
  const parseAISuggestions = (response, persona) => {
    const suggestions = [];
    
    // Look for common suggestion patterns
    const patterns = [
      { regex: /add more detail to (.+)/i, type: 'detail', action: 'add detail' },
      { regex: /strengthen (.+)/i, type: 'strength', action: 'strengthen' },
      { regex: /improve (.+)/i, type: 'improvement', action: 'improve' },
      { regex: /polish (.+)/i, type: 'polish', action: 'polish' },
      { regex: /clean up (.+)/i, type: 'cleanup', action: 'clean up' },
      { regex: /add (.+)/i, type: 'addition', action: 'add' },
      { regex: /include (.+)/i, type: 'inclusion', action: 'include' },
      { regex: /expand (.+)/i, type: 'expansion', action: 'expand' },
      { regex: /we need to (.+)/i, type: 'requirement', action: 'need to' },
      { regex: /let's (.+)/i, type: 'suggestion', action: 'let\'s' }
    ];
    
    patterns.forEach(({ regex, type, action }) => {
      const match = response.match(regex);
      if (match) {
        suggestions.push({
          type: type,
          target: match[1] || 'content',
          action: match[0],
          persona: persona,
          priority: persona === 'alex' ? 'high' : 'low'
        });
      }
    });
    
    return suggestions;
  };

  // Apply suggestion to content
  const applySuggestionToContent = (content, suggestion) => {
    if (!suggestion) return content;
    
    const timestamp = new Date().toLocaleTimeString();
    const personaName = suggestion.persona.toUpperCase();
    
    // Try to apply the suggestion intelligently based on type
    let updatedContent = content;
    
    switch (suggestion.type) {
      case 'detail':
        updatedContent = addDetailSuggestion(content, suggestion);
        break;
      case 'strength':
        updatedContent = addStrengthSuggestion(content, suggestion);
        break;
      case 'improvement':
        updatedContent = addImprovementSuggestion(content, suggestion);
        break;
      case 'polish':
        updatedContent = addPolishSuggestion(content, suggestion);
        break;
      case 'cleanup':
        updatedContent = addCleanupSuggestion(content, suggestion);
        break;
      default:
        // Fallback to adding a comment
        updatedContent = addCommentSuggestion(content, suggestion);
    }
    
    return updatedContent;
  };

  // Helper functions for different suggestion types
  const addDetailSuggestion = (content, suggestion) => {
    const detailNote = `\n\n[${suggestion.persona.toUpperCase()}] Add more detail to ${suggestion.target}: ${suggestion.action}`;
    return content + detailNote;
  };

  const addStrengthSuggestion = (content, suggestion) => {
    const strengthNote = `\n\n[${suggestion.persona.toUpperCase()}] Strengthen ${suggestion.target}: ${suggestion.action}`;
    return content + strengthNote;
  };

  const addImprovementSuggestion = (content, suggestion) => {
    const improvementNote = `\n\n[${suggestion.persona.toUpperCase()}] Improve ${suggestion.target}: ${suggestion.action}`;
    return content + improvementNote;
  };

  const addPolishSuggestion = (content, suggestion) => {
    const polishNote = `\n\n[${suggestion.persona.toUpperCase()}] Polish ${suggestion.target}: ${suggestion.action}`;
    return content + polishNote;
  };

  const addCleanupSuggestion = (content, suggestion) => {
    const cleanupNote = `\n\n[${suggestion.persona.toUpperCase()}] Clean up ${suggestion.target}: ${suggestion.action}`;
    return content + cleanupNote;
  };

  const addCommentSuggestion = (content, suggestion) => {
    const timestamp = new Date().toLocaleTimeString();
    const personaName = suggestion.persona.toUpperCase();
    
    const comment = `\n\n<!-- ${personaName}'s Suggestion (${timestamp}) -->
[${personaName}]: ${suggestion.action}
Priority: ${suggestion.priority}
Type: ${suggestion.type}
Target: ${suggestion.target}

<!-- End of ${personaName}'s Suggestion -->`;
    
    return content + comment;
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

    if (!showCollaboration && !isAlexTyping && !isSamTyping) {
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
        {/* Alex (Manager AI) */}
        <div className="ai-response alex-response">
          <div className="ai-header">
            <div className="ai-avatar">👩‍💼</div>
            <div className="ai-info">
              <strong>Alex</strong>
              <span>AI Manager</span>
            </div>
            {isAlexTyping && <div className="typing-indicator">💭 Thinking...</div>}
          </div>
          
          {alexResponse && (
            <div className="ai-content">
              <p>{alexResponse}</p>
              <button 
                className="apply-suggestion-btn"
                onClick={handleApplyAlexSuggestion}
                disabled={applyingSuggestion === 'alex'}
              >
                {applyingSuggestion === 'alex' ? 'Applying...' : 'Apply Alex\'s Suggestions'}
              </button>
            </div>
          )}
        </div>

        {/* Sam (Slacker AI) */}
        <div className="ai-response sam-response">
          <div className="ai-header">
            <div className="ai-avatar">😴</div>
            <div className="ai-info">
              <strong>Sam</strong>
              <span>AI Helper</span>
            </div>
            {isSamTyping && <div className="typing-indicator">💭 Thinking...</div>}
          </div>
          
            {samResponse && (
            <div className="ai-content">
              <p>{samResponse}</p>
              <button 
                className="apply-suggestion-btn"
                onClick={handleApplySamSuggestion}
                disabled={applyingSuggestion === 'sam'}
              >
                {applyingSuggestion === 'sam' ? 'Applying...' : 'Apply Sam\'s Suggestions'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="collaboration-footer">
        <button 
          className="refresh-collaboration-btn"
          onClick={handleManualTrigger}
          disabled={isAlexTyping || isSamTyping}
        >
          🔄 Refresh AI Responses
        </button>
      </div>
    </div>
  );
}
