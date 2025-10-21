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
  const [applyingSuggestion, setApplyingSuggestion] = useState(null);

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
    if (!lalaResponse) return;
    
    setApplyingSuggestion('lala');
    
    // Parse Lala's response for actionable suggestions
    const suggestions = parseAISuggestions(lalaResponse, 'lala');
    if (suggestions.length > 0) {
      // Apply the first suggestion to the content
      const updatedContent = applySuggestionToContent(reportContent, suggestions[0]);
      onContentUpdate(updatedContent);
      setLalaResponse(""); // Clear the response after applying
    } else {
      // If no specific suggestions found, just add a note
      const note = "\n\n[Lala's Note: " + lalaResponse + "]";
      onContentUpdate(reportContent + note);
      setLalaResponse("");
    }
    
    // Clear applying state after a short delay
    setTimeout(() => setApplyingSuggestion(null), 1000);
  };

  const handleApplyMinoSuggestion = () => {
    if (!minoResponse) return;
    
    setApplyingSuggestion('mino');
    
    // Parse Mino's response for suggestions
    const suggestions = parseAISuggestions(minoResponse, 'mino');
    if (suggestions.length > 0) {
      // Apply the first suggestion to the content
      const updatedContent = applySuggestionToContent(reportContent, suggestions[0]);
      onContentUpdate(updatedContent);
      setMinoResponse(""); // Clear the response after applying
    } else {
      // If no specific suggestions found, just add a note
      const note = "\n\n[Mino's Note: " + minoResponse + "]";
      onContentUpdate(reportContent + note);
      setMinoResponse("");
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
          priority: persona === 'lala' ? 'high' : 'low'
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
                disabled={applyingSuggestion === 'lala'}
              >
                {applyingSuggestion === 'lala' ? 'Applying...' : 'Apply Lala\'s Suggestions'}
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
                disabled={applyingSuggestion === 'mino'}
              >
                {applyingSuggestion === 'mino' ? 'Applying...' : 'Apply Mino\'s Suggestions'}
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
