import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';

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

  // Insert AI text at the end of document with color marking
  const insertAIText = useCallback((text, aiType, taskType = '') => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const colors = {
      ai_manager: '#4A90E2', // Blue
      ai_helper: '#93C263'   // Green
    };

    // Use red for review tasks, otherwise use default colors
    const color = (taskType === 'review') ? '#DC2626' : (colors[aiType] || '#000000');
    
    // Move cursor to end of document
    const docSize = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: docSize, to: docSize });
    
    // Insert the text first
    editor.commands.insertContent(`<p>${text}</p>`);
    
    // Then apply color and highlight using TipTap commands
    const newDocSize = editor.state.doc.content.size;
    const textLength = text.length;
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
      // For write tasks, use light blue/green highlight
      const highlightColor = aiType === 'ai_manager' ? '#EFF6FF' : '#F0F9FF';
      editor.commands.setHighlight({ color: highlightColor });
    }

    const editorState = useEditorState({
    editor,
    selector: ctx => {
      return {
        color: ctx.editor.getAttributes('textStyle').color,
        isPurple: ctx.editor.isActive('textStyle', { color: '#958DF1' }),
        isRed: ctx.editor.isActive('textStyle', { color: '#F98181' }),
        isOrange: ctx.editor.isActive('textStyle', { color: '#FBBC88' }),
        isYellow: ctx.editor.isActive('textStyle', { color: '#FAF594' }),
        isBlue: ctx.editor.isActive('textStyle', { color: '#70CFF8' }),
        isTeal: ctx.editor.isActive('textStyle', { color: '#94FADB' }),
        isGreen: ctx.editor.isActive('textStyle', { color: '#B9F18D' }),
      }
    },
  })
  }, [editorRef]);


  // Add AI comment to the editor
  const addAIComment = useCallback((text, aiType, taskType = '') => {
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
    
    // Use red for review tasks, orange for suggest, otherwise use default colors
    let color, highlightColor;
    if (taskType === 'review') {
      color = '#DC2626';
      highlightColor = '#FEF2F2';
    } else if (taskType === 'suggest') {
      color = '#EA580C';
      highlightColor = '#FFF7ED';
    } else {
      color = colors[aiType] || '#000000';
      highlightColor = backgrounds[aiType] || '#F9FAFB';
    }
    
    // If no selection, insert at current cursor position
    if (from === to) {
      const cursorPos = editor.state.selection.from;
      editor.commands.insertContent(`<span class="ai-comment" data-ai-type="${aiType}">${text}</span>`);
      
      // Apply color and highlight to the inserted text
      const newPos = cursorPos + text.length + 50; // Approximate position after insertion
      editor.commands.setTextSelection({ from: cursorPos, to: newPos });
      editor.commands.setColor(color);
      editor.commands.setHighlight({ color: highlightColor });
    } else {
      // If there's a selection, wrap it with the comment
      const selectedText = editor.state.doc.textBetween(from, to);
      editor.commands.insertContent(
        `<span class="ai-comment" data-ai-type="${aiType}">${selectedText}</span>`
      );
      
      // Apply color and highlight to the wrapped text
      editor.commands.setTextSelection({ from, to: to + 50 }); // Approximate new position
      editor.commands.setColor(color);
      editor.commands.setHighlight({ color: highlightColor });
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
        insertAIText(aiResponse, aiType, taskType);
      } else if (responseType === 'comment') {
        addAIComment(aiResponse, aiType, taskType);
      } else if (responseType === 'review') {
        // Only add as a comment in the sidebar, not in the editor
        if (onAddComment) {
          const aiName = aiType === 'ai_manager' ? 'Alex (AI Manager)' : 'Sam (AI Helper)';
          const commentText = `Review by ${aiName}:\n${aiResponse}`;
          onAddComment(commentText, 'review', aiName);
        }
      } else if (responseType === 'suggest') {
        // Only add as a comment in the sidebar, not in the editor
        if (onAddComment) {
          const aiName = aiType === 'ai_manager' ? 'Alex (AI Manager)' : 'Sam (AI Helper)';
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
