import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';
import AlexAvatar from '../images/Alex.png';
import SamAvatar from '../images/Sam.png';

const backend_host = "http://localhost:3002";

export const useAITeam = (projectId, editorRef, onAddComment = null) => {
  const [loadingAIs, setLoadingAIs] = useState(new Set());
  const [taskCompletionMessages, setTaskCompletionMessages] = useState([]);

  // Utility to get token safely
  const getIdTokenSafely = async () => {
    try {
      const auth = getAuth();
      if (auth && auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch (err) {
      console.error('Error getting token:', err);
    }
    return null;
  };

  // Insert AI text at the end of document with color marking and avatar
  const insertAIText = useCallback(async (text, aiType, taskType = '') => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    
    // Get AI teammate info - supports new 5-agent team and legacy IDs
    let aiTeammate;
    
    // Check if it's one of the new agents
    if (AI_TEAMMATES[aiType]) {
      aiTeammate = AI_TEAMMATES[aiType];
    } 
    // Legacy mapping
    else if (aiType === 'rasoa' || aiType === 'ai_manager') {
      aiTeammate = AI_TEAMMATES.brown;
    } else if (aiType === 'rakoto' || aiType === 'ai_helper') {
      aiTeammate = AI_TEAMMATES.sam;
    } else {
      // Default to brown if unknown
      aiTeammate = AI_TEAMMATES.brown;
    }
    
    const aiName = aiTeammate.name;
    const aiRole = aiTeammate.role;
    const aiColor = aiTeammate.color;
    const aiAvatar = aiTeammate.emoji; // Use emoji instead of images

    // Calculate word count for contribution tracking
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Use red for review tasks, otherwise use agent's color
    const color = (taskType === 'review') ? '#DC2626' : aiColor;
    
    // Move cursor to end of document
    const docSize = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: docSize, to: docSize });
    
    // Create avatar HTML element with emoji
    const avatarHtml = `
      <div class="ai-contribution-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; background: linear-gradient(135deg, ${aiColor}20 0%, ${aiColor}10 100%); border-radius: 8px; border-left: 3px solid ${aiColor};">
        <div class="ai-contribution-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${aiColor} 0%, ${aiColor}CC 100%); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid rgba(255,255,255,0.3); font-size: 18px;">
          ${aiAvatar}
        </div>
        <div class="ai-contribution-info" style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: 600; color: ${aiColor}; font-size: 0.9rem;">${aiName}</span>
          <span style="font-size: 0.75rem; color: #6b7280;">${aiRole}</span>
        </div>
      </div>
    `;
    
    // Insert avatar header and text
    editor.commands.insertContent(`${avatarHtml}<p>${text}</p>`);
    
    // Apply color and highlight to the text content only
    const newDocSize = editor.state.doc.content.size;
    const textLength = text.length;
    const headerLength = avatarHtml.length;
    
    // Select only the text content (not the avatar header)
    editor.commands.setTextSelection({ 
      from: newDocSize - textLength - 7, // -7 for <p></p> tags
      to: newDocSize - 4 // -4 for </p> tag
    });
    editor.commands.setColor(color);
    
    // Apply highlight based on task type
    if (taskType === 'review') {
      editor.commands.setHighlight({ color: '#FEF2F2' }); // Light red highlight
    } else if (taskType === 'suggest') {
      editor.commands.setHighlight({ color: '#FFF7ED' }); // Light orange highlight
    } else {
      // For write tasks, use agent's color with transparency
      const highlightColor = aiColor + '20';
      editor.commands.setHighlight({ color: highlightColor });
    }

    // Track word count contribution for write tasks
    if (wordCount > 0 && projectId && taskType === 'write_section') {
      try {
        const token = await getIdTokenSafely();
        if (token) {
          await axios.post(`${backend_host}/api/project/${projectId}/word-contributions/track`, {
            contributorId: aiType,
            contributorName: aiName,
            contributorRole: aiRole,
            wordCount: wordCount,
            taskType: taskType
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`Tracked ${wordCount} words for ${aiName} (${aiType})`);
        }
      } catch (error) {
        console.error('Error tracking word count contribution:', error);
      }
    }
  }, [editorRef, projectId, getIdTokenSafely]);


  // Add AI comment to the editor
  const addAIComment = useCallback((text, aiType, taskType = '') => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const { from, to } = editor.state.selection;
    
    // Get AI teammate for color
    let aiTeammate;
    if (AI_TEAMMATES[aiType]) {
      aiTeammate = AI_TEAMMATES[aiType];
    } else if (aiType === 'rasoa' || aiType === 'ai_manager') {
      aiTeammate = AI_TEAMMATES.brown;
    } else if (aiType === 'rakoto' || aiType === 'ai_helper') {
      aiTeammate = AI_TEAMMATES.sam;
    } else {
      aiTeammate = AI_TEAMMATES.brown;
    }
    
    const aiColor = aiTeammate.color;
    const highlightColor = aiColor + '20'; // Add transparency
    
    // Use red for review tasks, orange for suggest, otherwise use agent color
    let color, backgroundColor;
    if (taskType === 'review') {
      color = '#DC2626';
      backgroundColor = '#FEF2F2';
    } else if (taskType === 'suggest') {
      color = '#EA580C';
      backgroundColor = '#FFF7ED';
    } else {
      color = aiColor;
      backgroundColor = highlightColor;
    }
    
    // If no selection, insert at current cursor position
    if (from === to) {
      const cursorPos = editor.state.selection.from;
      editor.commands.insertContent(`<span class="ai-comment" data-ai-type="${aiType}">${text}</span>`);
      
      // Apply color and highlight to the inserted text
      const newPos = cursorPos + text.length + 50; // Approximate position after insertion
      editor.commands.setTextSelection({ from: cursorPos, to: newPos });
      editor.commands.setColor(color);
      editor.commands.setHighlight({ color: backgroundColor });
    } else {
      // If there's a selection, wrap it with the comment
      const selectedText = editor.state.doc.textBetween(from, to);
      editor.commands.insertContent(
        `<span class="ai-comment" data-ai-type="${aiType}">${selectedText}</span>`
      );
      
      // Apply color and highlight to the wrapped text
      editor.commands.setTextSelection({ from, to: to + 50 }); // Approximate new position
      editor.commands.setColor(color);
      editor.commands.setHighlight({ color: backgroundColor });
    }
  }, [editorRef]);

  // Perform AI task
  const performAITask = useCallback(async (aiType, taskType, sectionName = '', currentContent = '') => {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Add this AI to loading set
    setLoadingAIs(prev => new Set([...prev, aiType]));
    
    try {
      const token = await getIdTokenSafely();
      
      // Determine the correct endpoint based on task type
      let endpoint = '';
      let requestData = { aiType };
      
      switch (taskType) {
        case 'write_section':
          endpoint = `${backend_host}/api/project/${projectId}/ai/write`;
          requestData = { aiType, sectionName, currentContent };
          break;
        case 'review':
        case 'review_content':
          endpoint = `${backend_host}/api/project/${projectId}/ai/review`;
          requestData = { aiType, currentContent };
          break;
        case 'suggest_improvements':
          endpoint = `${backend_host}/api/project/${projectId}/ai/suggest`;
          requestData = { aiType, currentContent };
          break;
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }
      
      console.log('Sending AI task request:', { endpoint, requestData });
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );

      const { response: aiResponse, responseType, completionMessage } = response.data;

      // Handle the response based on type
      if (responseType === 'text') {
        insertAIText(aiResponse, aiType, taskType);
      } else if (responseType === 'comment') {
        addAIComment(aiResponse, aiType, taskType);
      } else if (responseType === 'review') {
        // Only add as a comment in the sidebar, not in the editor
        if (onAddComment) {
          // Get AI teammate info
          let aiTeammate;
          if (AI_TEAMMATES[aiType]) {
            aiTeammate = AI_TEAMMATES[aiType];
          } else if (aiType === 'rasoa' || aiType === 'ai_manager') {
            aiTeammate = AI_TEAMMATES.brown;
          } else if (aiType === 'rakoto' || aiType === 'ai_helper') {
            aiTeammate = AI_TEAMMATES.sam;
          } else {
            aiTeammate = AI_TEAMMATES.brown; // default
          }
          const aiName = `${aiTeammate.name} (${aiTeammate.role})`;
          const commentText = `Review by ${aiName}:\n${aiResponse}`;
          onAddComment(commentText, 'review', aiName);
        }
      } else if (responseType === 'suggest') {
        // Only add as a comment in the sidebar, not in the editor
        if (onAddComment) {
          // Get AI teammate info
          let aiTeammate;
          if (AI_TEAMMATES[aiType]) {
            aiTeammate = AI_TEAMMATES[aiType];
          } else if (aiType === 'rasoa' || aiType === 'ai_manager') {
            aiTeammate = AI_TEAMMATES.brown;
          } else if (aiType === 'rakoto' || aiType === 'ai_helper') {
            aiTeammate = AI_TEAMMATES.sam;
          } else {
            aiTeammate = AI_TEAMMATES.brown; // default
          }
          const aiName = `${aiTeammate.name} (${aiTeammate.role})`;
          const commentText = `Suggestion by ${aiName}:\n${aiResponse}`;
          onAddComment(commentText, 'suggestion', aiName);
        }
      }

      // Add completion message to the feedback system
      const messageId = Date.now() + Math.random(); // Ensure unique ID
      setTaskCompletionMessages(prev => [
        ...prev,
        {
          id: messageId,
          aiType,
          message: completionMessage,
          timestamp: Date.now()
        }
      ]);

      // Auto-remove completion message after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => 
          prev.filter(msg => msg.id !== messageId)
        );
      }, 5000);

      return response.data;
    } catch (error) {
      console.error('AI Task error:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      throw error;
    } finally {
      // Remove this AI from loading set
      setLoadingAIs(prev => {
        const newSet = new Set(prev);
        newSet.delete(aiType);
        return newSet;
      });
    }
  }, [projectId, insertAIText, addAIComment]);

  // Clear completion messages
  const clearCompletionMessages = useCallback(() => {
    setTaskCompletionMessages([]);
  }, []);

  // Remove specific completion message
  const removeCompletionMessage = useCallback((messageId) => {
    setTaskCompletionMessages(prev => 
      prev.filter(msg => msg.id !== messageId)
    );
  }, []);

  return {
    performAITask,
    isLoading: loadingAIs.size > 0,
    loadingAIs,
    taskCompletionMessages,
    clearCompletionMessages,
    removeCompletionMessage
  };
};
