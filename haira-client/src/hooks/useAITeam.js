import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';

const backend_host = "http://localhost:3002";

export const useAITeam = (projectId, editorRef) => {
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

  // Insert AI text at the end of document with color marking
  const insertAIText = useCallback((text, aiType) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const colors = {
      ai_manager: '#4A90E2', // Blue
      ai_helper: '#93C263'   // Green
    };

    const color = colors[aiType] || '#000000';
    
    // Move cursor to end of document
    const docSize = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: docSize, to: docSize });
    
    // Insert the text with color styling at the end using TipTap's textStyle
    editor.commands.insertContent(
      `<p><span data-ai-type="${aiType}" style="color: ${color}; font-weight: 500; background-color: ${aiType === 'ai_manager' ? '#EFF6FF' : '#F0F9FF'}; padding: 2px 4px; border-radius: 3px; border-left: 3px solid ${color};">${text}</span></p>`
    );
  }, [editorRef]);

  // Add AI comment to the editor
  const addAIComment = useCallback((text, aiType) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const { from, to } = editor.state.selection;
    
    const colors = {
      ai_manager: '#4A90E2',
      ai_helper: '#93C263'
    };
    
    const backgrounds = {
      ai_manager: '#EFF6FF',
      ai_helper: '#F0F9FF'
    };
    
    const color = colors[aiType] || '#000000';
    const background = backgrounds[aiType] || '#F9FAFB';
    
    // If no selection, insert at current cursor position
    if (from === to) {
      const cursorPos = editor.state.selection.from;
      editor.commands.insertContent(
        `<span class="ai-comment" data-ai-type="${aiType}" style="background-color: ${background}; padding: 2px 4px; border-radius: 3px; border-left: 3px solid ${color};">${text}</span>`
      );
    } else {
      // If there's a selection, wrap it with the comment
      const selectedText = editor.state.doc.textBetween(from, to);
      editor.commands.insertContent(
        `<span class="ai-comment" data-ai-type="${aiType}" style="background-color: ${background}; padding: 2px 4px; border-radius: 3px; border-left: 3px solid ${color};">${selectedText}</span>`
      );
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
        insertAIText(aiResponse, aiType);
      } else if (responseType === 'comment') {
        addAIComment(aiResponse, aiType);
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
