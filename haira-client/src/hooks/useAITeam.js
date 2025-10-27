import React, { useState, useCallback } from 'react';
import { auth, serverFirebaseAvailable } from '../../firebase';
import axios from 'axios';
import { getAIAgents } from '../services/aiAgentsService.js';
import { getChromeWriter } from '../utils/chromeAPI.js';

const backend_host = import.meta.env.VITE_BACKEND_HOST;

const convertMarkdownToHTML = (markdown) => {
  if (!markdown) return '';
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h1-6]|<[uo]l|<li)(.*)$/gm, (match, content) => {
      if (content.trim() === '') return '';
      return `<p>${content}</p>`;
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '');
};

const convertMarkdownToPlainText = (markdown) => {
  if (!markdown) return '';
  return markdown
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\d+\.\s+(.*)$/gm, '• $1')
    .replace(/^[-*]\s+(.*)$/gm, '• $1')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
};

export const useAITeam = (projectId, editorRef, onAddComment = null) => {
  const [loadingAIs, setLoadingAIs] = useState(new Set());
  const [taskCompletionMessages, setTaskCompletionMessages] = useState([]);
  const [aiAgents, setAiAgents] = useState({ AI_TEAMMATES: {} });
  const [agentsLoaded, setAgentsLoaded] = useState(false);

  // Load AI agents on mount
  React.useEffect(() => {
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAiAgents(agents);
        setAgentsLoaded(true);
      } catch (error) {
        console.error('Error loading AI agents:', error);
        setAgentsLoaded(true); // Still set to true to prevent infinite loading
      }
    };
    loadAIAgents();
  }, []);

  const resolveTeammate = (aiType) => {
    if (!agentsLoaded || !aiAgents.AI_TEAMMATES) {
      return { name: aiType, role: 'AI Assistant', avatar: '🤖', emoji: '🤖', color: '#666' };
    }
    return aiAgents.AI_TEAMMATES[aiType] || aiAgents.AI_TEAMMATES.rasoa || { name: aiType, role: 'AI Assistant', avatar: '🤖', emoji: '🤖', color: '#666' };
  };
  // AI Content Reflection state - now an array to handle multiple pending reflections
  const [pendingAIContentReflections, setPendingAIContentReflections] = useState([]);

  const getIdTokenSafely = async () => {
    try {
      if (serverFirebaseAvailable) {
        if (auth && auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      } else {
        // Fallback to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        if (currentUser) {
          return `mock-token-${currentUser.uid}-${Date.now()}`;
        }
      }
    } catch (err) {
      console.error('Error getting token:', err);
      // Fallback to localStorage token on error
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      if (currentUser) {
        return `mock-token-${currentUser.uid}-${Date.now()}`;
      }
    }
    return null;
  };

  const generateCompletionMessage = async (aiType, taskType) => {
    try {
      console.log('🎯 Generating completion message for:', { aiType, taskType });
      console.log('🔍 Debug projectId:', projectId);
      console.log('🔍 Debug backend_host:', backend_host);
      
      const token = await getIdTokenSafely();
      const endpoint = `${backend_host}/api/project/${projectId}/ai/completion-message`;
      const requestData = { aiType, taskType };
      
      console.log('🚀 Calling completion message API:', { endpoint, requestData });
      const { data } = await axios.post(endpoint, requestData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      console.log('📥 Completion message received:', data.completionMessage);
      return data.completionMessage;
    } catch (error) {
      console.error('❌ Error generating completion message:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      // Fallback to simple message
      return `${aiType} completed the ${taskType} task`;
    }
  };

  const insertAIText = useCallback(async (text, aiType, taskType = '') => {
    console.log('📝 insertAIText called with:', { text: text?.substring(0, 100) + '...', aiType, taskType });
    
    if (!editorRef.current) {
      console.log('❌ insertAIText: No editor reference available');
      return;
    }

    const editor = editorRef.current;
    const aiTeammate = resolveTeammate(aiType);
    const { name, role, color, emoji } = aiTeammate;
    
    console.log('👤 AI Teammate resolved:', { name, role, color, emoji });

    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const textColor = taskType === 'review' ? '#DC2626' : color;
    
    console.log('📊 Text stats:', { wordCount, textColor });

    const docSize = editor.state.doc.content.size;
    console.log('📄 Current document size:', docSize);
    
    editor.commands.setTextSelection({ from: docSize, to: docSize });

    const avatarHtml = `
      <div class="ai-contribution-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:linear-gradient(135deg,${color}20 0%,${color}10 100%);border-radius:8px;border-left:3px solid ${color};">
        <div class="ai-contribution-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${color} 0%,${color}CC 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);border:2px solid rgba(255,255,255,0.3);font-size:18px;">${emoji}</div>
        <div class="ai-contribution-info" style="display:flex;flex-direction:column;gap:2px;">
          <span style="font-weight:600;color:${color};font-size:0.9rem;">${name}</span>
          <span style="font-size:0.75rem;color:#6b7280;">${role}</span>
        </div>
      </div>`;

    console.log('🎨 Inserting content into editor...');
    editor.commands.insertContent(`${avatarHtml}<p>${text}</p>`);
    
    const newDocSize = editor.state.doc.content.size;
    console.log('📄 New document size:', newDocSize);
    
    editor.commands.setTextSelection({ from: newDocSize - text.length - 7, to: newDocSize - 4 });
    editor.commands.setColor(textColor);

    const highlightMap = { review: '#FEF2F2', suggest: '#FFF7ED', write_section: color + '20' };
    editor.commands.setHighlight({ color: highlightMap[taskType] || color + '20' });
    
    console.log('✅ Content inserted and styled successfully');
  }, [editorRef, projectId, getIdTokenSafely]);

  const addAIComment = useCallback((text, aiType, taskType = '') => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const { from, to } = editor.state.selection;

    const { color } = resolveTeammate(aiType);
    const backgroundMap = {
      review: ['#DC2626', '#FEF2F2'],
      suggest: ['#EA580C', '#FFF7ED'],
      default: [color, color + '20']
    };
    const [textColor, bgColor] = backgroundMap[taskType] || backgroundMap.default;

    const insertAtCursor = () => {
      const cursorPos = editor.state.selection.from;
      editor.commands.insertContent(`<span class="ai-comment" data-ai-type="${aiType}">${text}</span>`);
      editor.commands.setTextSelection({ from: cursorPos, to: cursorPos + text.length + 50 });
      editor.commands.setColor(textColor);
      editor.commands.setHighlight({ color: bgColor });
    };

    if (from === to) insertAtCursor();
    else {
      const selectedText = editor.state.doc.textBetween(from, to);
      editor.commands.insertContent(`<span class="ai-comment" data-ai-type="${aiType}">${selectedText}</span>`);
      editor.commands.setTextSelection({ from, to: to + 50 });
      editor.commands.setColor(textColor);
      editor.commands.setHighlight({ color: bgColor });
    }
  }, [editorRef]);

  const performWriteTask = useCallback(async (aiTeammate, sectionName, currentContent, projectTitle = null) => {
    console.log('🎯 performWriteTask called with:', { aiTeammate, sectionName, currentContent: currentContent?.substring(0, 50) + '...' });
    
    // Set loading state
    console.log('🔄 Setting loading state for:', aiTeammate.id);
    setLoadingAIs(prev => {
      const newSet = new Set([...prev, aiTeammate.id]);
      console.log('🔄 New loading state:', Array.from(newSet));
      return newSet;
    });
    
    // Create server fallback function
    const serverFallback = async () => {
      console.log('🔄 Server fallback: Calling OpenAI API...');
      const token = await getIdTokenSafely();
      const endpoint = `${backend_host}/api/project/${projectId}/ai/write`;
      const requestData = { 
        aiType: aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate), 
        sectionName, 
        currentContent,
        projectTitle
      };
      
      console.log('🚀 Server fallback: Sending write request:', requestData);
      const { data } = await axios.post(endpoint, requestData, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('📥 Server fallback: Received response from OpenAI:', {
        success: data.success,
        aiType: data.aiType,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 100) + '...',
        completionMessage: data.completionMessage
      });
      
      return {
        content: data.content || data.response,
        source: 'openai-server',
        error: null
      };
    };
    
    // Try Chrome Writer API first
    console.log('🔧 AI Service: Trying Chrome Writer API first...');
    try {
      const result = await getChromeWriter(currentContent, 'write_section', aiTeammate, serverFallback, sectionName, projectTitle);
      
      console.log('📥 Chrome Writer result:', {
        source: result.source,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100) + '...',
        error: result.error
      });
      
      const htmlResponse = convertMarkdownToHTML(result.content);
      console.log('🔄 Client: Converted to HTML:', htmlResponse?.substring(0, 100) + '...');
      
      // Don't insert text automatically - wait for user reflection
      console.log('📝 Client: AI text generated, waiting for user reflection...');
      
      // Completion message will be shown in the reflection modal instead of as a popup
        // Generate AI completion message and show reflection modal
        console.log('💬 Client: Generating AI completion message...');
        let aiCompletionMessage = '';
        try {
          const token = await getIdTokenSafely();
          if (token) {
            const completionResponse = await axios.post(`${backend_host}/api/project/${projectId}/ai/completion-message`, 
              {
                aiType: aiTeammate.id,
                taskType: 'write'
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (completionResponse.data.success) {
              aiCompletionMessage = completionResponse.data.completionMessage;
              console.log('✅ Client: AI completion message generated');
            }
          }
        } catch (error) {
          console.error('Error generating completion message:', error);
          aiCompletionMessage = 'Task completed!'; // Fallback message
        }

        // Add to pending reflections array instead of replacing
        console.log('📝 Client: Adding AI content reflection to pending list...');
        const newReflection = {
          id: Date.now() + Math.random(), // Unique ID
          isOpen: true,
          content: htmlResponse, // Show HTML content for proper display
          aiTeammate: aiTeammate,
          aiCompletionMessage: aiCompletionMessage, // Include AI's completion message
          pendingResult: {
            htmlContent: htmlResponse,
            aiType: aiTeammate.id,
            taskType: 'write_section'
          }
        };
        
        setPendingAIContentReflections(prev => [...prev, newReflection]);
        console.log('✅ Client: AI content reflection added to pending list');
      
      return result;
      
    } catch (error) {
      console.error('❌ Chrome Writer failed, using server fallback:', error);
      const fallbackResult = await serverFallback();
      
      const htmlResponse = convertMarkdownToHTML(fallbackResult.content);
      console.log('🔄 Client: Converted fallback to HTML:', htmlResponse?.substring(0, 100) + '...');
      
      // Instead of directly inserting, show reflection modal for fallback too
      console.log('📝 Client: Showing fallback AI content reflection modal...');
      
      // Generate AI completion message for fallback
      let aiCompletionMessage = '';
      try {
        const token = await getIdTokenSafely();
        if (token) {
          const completionResponse = await axios.post(`${backend_host}/api/project/${projectId}/ai/completion-message`, 
            {
              aiType: aiTeammate.id,
              taskType: 'write'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (completionResponse.data.success) {
            aiCompletionMessage = completionResponse.data.completionMessage;
            console.log('✅ Client: Fallback AI completion message generated');
          }
        }
      } catch (error) {
        console.error('Error generating fallback completion message:', error);
        aiCompletionMessage = 'Task completed!'; // Fallback message
      }

      // Add to pending reflections array instead of using non-existent function
      console.log('📝 Client: Adding fallback AI content reflection to pending list...');
      const newReflection = {
        id: Date.now() + Math.random(), // Unique ID
        isOpen: true,
        content: htmlResponse, // Show HTML content for proper display
        aiTeammate: aiTeammate,
        aiCompletionMessage: aiCompletionMessage, // Include AI's completion message
        pendingResult: {
          htmlContent: htmlResponse,
          aiType: aiTeammate.id,
          taskType: 'write_section'
        }
      };
      
      setPendingAIContentReflections(prev => [...prev, newReflection]);
      console.log('✅ Client: Fallback AI content reflection added to pending list');
      
      // Completion message is already included in the reflection modal
      
      return fallbackResult;
    } finally {
      // Clear loading state
      console.log('🔄 Clearing loading state for:', aiTeammate.id);
      setLoadingAIs(prev => {
        const newSet = new Set(prev);
        newSet.delete(aiTeammate.id);
        console.log('🔄 Final loading state:', Array.from(newSet));
        return newSet;
      });
    }
  }, [projectId, insertAIText]);

  const performReviewTask = useCallback(async (aiTeammate, currentContent) => {
    console.log('🎯 performReviewTask called with:', { aiTeammate, currentContent: currentContent?.substring(0, 50) + '...' });
    
    // Set loading state
    setLoadingAIs(prev => new Set([...prev, aiTeammate.id]));
    
    // Create server fallback function
    const serverFallback = async () => {
      const token = await getIdTokenSafely();
      const endpoint = `${backend_host}/api/project/${projectId}/ai/review`;
      const requestData = { 
        aiType: aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate), 
        currentContent 
      };
      
      console.log('🚀 Server fallback: Sending review request:', requestData);
      const { data } = await axios.post(endpoint, requestData, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('📥 Server fallback: Received review response from OpenAI:', {
        success: data.success,
        aiType: data.aiType,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 100) + '...',
        completionMessage: data.completionMessage
      });
      
      return {
        content: data.content || data.response,
        source: 'openai-server',
        error: null
      };
    };
    
    // Try Chrome API first (if available for review)
    console.log('🔧 AI Service: Trying Chrome API first for review...');
    try {
      const result = await getChromeWriter(currentContent, 'review', aiTeammate, serverFallback);
      
      console.log('📥 Chrome Writer result:', {
        source: result.source,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100) + '...',
        error: result.error
      });
      
      console.log('📥 Review result:', {
        source: result.source,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100) + '...',
        error: result.error
      });
      
      const plainResponse = convertMarkdownToPlainText(result.content);
      console.log('🔄 Client: Converted to plain text:', plainResponse?.substring(0, 100) + '...');
      
      console.log('📝 Client: Adding review comment...');
      if (onAddComment) onAddComment(`Review by ${aiTeammate.name}:\n${plainResponse}`, 'review', aiTeammate.name);
      console.log('✅ Client: Review comment added successfully');
      
      // Generate completion message from API
      const aiType = aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate);
      const generatedMessage = await generateCompletionMessage(aiType, 'review');
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: result.completionMessage || generatedMessage,
        timestamp: Date.now()
      };
      setTaskCompletionMessages(prev => [...prev, completionMessage]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== completionMessage.id));
      }, 5000);
      
      return result;
      
    } catch (error) {
      console.error('❌ Review failed, using server fallback:', error);
      const fallbackResult = await serverFallback();
      
      const plainResponse = convertMarkdownToPlainText(fallbackResult.content);
      console.log('🔄 Client: Converted fallback to plain text:', plainResponse?.substring(0, 100) + '...');
      
      console.log('📝 Client: Adding fallback review comment...');
      if (onAddComment) onAddComment(`Review by ${aiTeammate.name}:\n${plainResponse}`, 'review', aiTeammate.name);
      console.log('✅ Client: Fallback review comment added successfully');
      
      // Generate completion message from API
      const aiType = aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate);
      const generatedMessage = await generateCompletionMessage(aiType, 'review');
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: fallbackResult.completionMessage || generatedMessage,
        timestamp: Date.now()
      };
      setTaskCompletionMessages(prev => [...prev, completionMessage]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== completionMessage.id));
      }, 5000);
      
      return fallbackResult;
    } finally {
      // Clear loading state
      setLoadingAIs(prev => {
        const newSet = new Set(prev);
        newSet.delete(aiTeammate.id);
        return newSet;
      });
    }
  }, [projectId, onAddComment]);

  const performSuggestTask = useCallback(async (aiTeammate, currentContent) => {
    console.log('🎯 performSuggestTask called with:', { aiTeammate, currentContent: currentContent?.substring(0, 50) + '...' });
    
    // Set loading state
    setLoadingAIs(prev => new Set([...prev, aiTeammate.id]));
    
    // Create server fallback function
    const serverFallback = async () => {
      console.log('🔄 Server fallback: Calling OpenAI API for suggestions...');
      const token = await getIdTokenSafely();
      const endpoint = `${backend_host}/api/project/${projectId}/ai/suggest`;
      const requestData = { 
        aiType: aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate), 
        currentContent 
      };
      
      console.log('🚀 Server fallback: Sending suggest request:', requestData);
      const { data } = await axios.post(endpoint, requestData, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('📥 Server fallback: Received suggest response from OpenAI:', {
        success: data.success,
        aiType: data.aiType,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 100) + '...',
        completionMessage: data.completionMessage
      });
      
      return {
        content: data.content || data.response,
        source: 'openai-server',
        error: null
      };
    };
    
    // Try Chrome API first (if available for suggestions)
    console.log('🔧 AI Service: Trying Chrome API first for suggestions...');
    try {
      const result = await getChromeWriter(currentContent, 'suggestion', aiTeammate, serverFallback);
      
      console.log('📥 Chrome Writer result:', {
        source: result.source,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100) + '...',
        error: result.error
      });
      
      console.log('📥 Suggest result:', {
        source: result.source,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100) + '...',
        error: result.error
      });
      
      const plainResponse = convertMarkdownToPlainText(result.content);
      console.log('🔄 Client: Converted to plain text:', plainResponse?.substring(0, 100) + '...');
      
      console.log('📝 Client: Adding suggestion comment...');
      if (onAddComment) onAddComment(`Suggestion by ${aiTeammate.name}:\n${plainResponse}`, 'suggest', aiTeammate.name);
      console.log('✅ Client: Suggestion comment added successfully');
      
      // Generate completion message from API
      const aiType = aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate);
      const generatedMessage = await generateCompletionMessage(aiType, 'suggest');
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: result.completionMessage || generatedMessage,
        timestamp: Date.now()
      };
      setTaskCompletionMessages(prev => [...prev, completionMessage]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== completionMessage.id));
      }, 5000);
      
      return result;
      
    } catch (error) {
      console.error('❌ Suggest failed, using server fallback:', error);
      const fallbackResult = await serverFallback();
      
      const plainResponse = convertMarkdownToPlainText(fallbackResult.content);
      console.log('🔄 Client: Converted fallback to plain text:', plainResponse?.substring(0, 100) + '...');
      
      console.log('📝 Client: Adding fallback suggestion comment...');
      if (onAddComment) onAddComment(`Suggestion by ${aiTeammate.name}:\n${plainResponse}`, 'suggest', aiTeammate.name);
      console.log('✅ Client: Fallback suggestion comment added successfully');
      
      // Generate completion message from API
      const aiType = aiTeammate.id || Object.keys(aiAgents.AI_TEAMMATES || {}).find(key => aiAgents.AI_TEAMMATES[key] === aiTeammate);
      const generatedMessage = await generateCompletionMessage(aiType, 'suggest');
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: fallbackResult.completionMessage || generatedMessage,
        timestamp: Date.now()
      };
      setTaskCompletionMessages(prev => [...prev, completionMessage]);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== completionMessage.id));
      }, 5000);
      
      return fallbackResult;
    } finally {
      // Clear loading state
      setLoadingAIs(prev => {
        const newSet = new Set(prev);
        newSet.delete(aiTeammate.id);
        return newSet;
      });
    }
  }, [projectId, onAddComment]);

  const clearCompletionMessages = useCallback(() => setTaskCompletionMessages([]), []);
  const removeCompletionMessage = useCallback((messageId) => setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== messageId)), []);

  // Function to build styled content with mixed AI/user styling
  const buildStyledContent = useCallback((differences, aiType) => {
    if (!differences || differences.length === 0) return '';
    
    let styledContent = '';
    
    differences.forEach(diff => {
      switch (diff.type) {
        case 'unchanged':
          // AI content - use AI styling
          const { color } = resolveTeammate(aiType);
          styledContent += `<span style="color: ${color}; background-color: ${color}20;">${diff.content}</span> `;
          break;
        case 'added':
        case 'modified':
          // User content - use black text
          styledContent += `<span style="color: #000000; background-color: transparent;">${diff.content}</span> `;
          break;
        case 'removed':
          // Don't include removed content
          break;
        default:
          styledContent += `${diff.content} `;
      }
    });
    
    return styledContent.trim();
  }, []);

  // AI Content Reflection Handlers
  const handleAcceptAIContent = useCallback(async (reflectionData, reflectionId) => {
    try {
      // Find the specific reflection
      const reflection = pendingAIContentReflections.find(r => r.id === reflectionId);
      if (!reflection) return;

      // Insert AI content into editor
      if (reflection.pendingResult) {
        insertAIText(
          reflection.pendingResult.htmlContent, 
          reflection.pendingResult.aiType, 
          reflection.pendingResult.taskType
        );
      }

      // Save reflection data to backend
      const token = await getIdTokenSafely();
      if (token) {
        await axios.post(`${backend_host}/api/project/${projectId}/ai-content-reflection`, 
          reflectionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Remove this reflection from pending list
      setPendingAIContentReflections(prev => prev.filter(r => r.id !== reflectionId));

      // Content handled silently - no additional completion message needed

    } catch (error) {
      console.error('Error accepting AI content:', error);
    }
  }, [pendingAIContentReflections, projectId, insertAIText, getIdTokenSafely]);

  const handleModifyAIContent = useCallback(async (reflectionData, reflectionId) => {
    try {
      console.log('🔄 handleModifyAIContent called with:', { reflectionData, reflectionId });
      
      // Find the specific reflection
      const reflection = pendingAIContentReflections.find(r => r.id === reflectionId);
      if (!reflection) {
        console.error('❌ Reflection not found:', reflectionId);
        return;
      }

      console.log('📝 Found reflection:', reflection);

      // Insert the modified content
      if (reflectionData.modifiedContent) {
        if (editorRef.current) {
          const editor = editorRef.current;
          const aiTeammate = resolveTeammate(reflection.pendingResult.aiType);
          const { name, role, color, emoji } = aiTeammate;
          
          console.log('👤 AI Teammate resolved:', { name, role, color, emoji });
          
          const docSize = editor.state.doc.content.size;
          console.log('📄 Current document size:', docSize);
          
          // Move cursor to end
          editor.commands.setTextSelection({ from: docSize, to: docSize });

          // Build the avatar HTML
          const avatarHtml = `
            <div class="ai-contribution-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:linear-gradient(135deg,${color}20 0%,${color}10 100%);border-radius:8px;border-left:3px solid ${color};">
              <div class="ai-contribution-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${color} 0%,${color}CC 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);border:2px solid rgba(255,255,255,0.3);font-size:18px;">${emoji}</div>
              <div class="ai-contribution-info" style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-weight:600;color:${color};font-size:0.9rem;">${name}</span>
                <span style="font-size:0.75rem;color:#6b7280;">${role}</span>
              </div>
            </div>`;

          // Convert plain text to HTML paragraphs
          const htmlContent = reflectionData.modifiedContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => `<p>${line}</p>`)
            .join('');

          console.log('🎨 Inserting modified content...');
          editor.commands.insertContent(`${avatarHtml}${htmlContent}`);
          
          const newDocSize = editor.state.doc.content.size;
          console.log('📄 New document size:', newDocSize);
          
          console.log('✅ Modified content inserted successfully');
        }
      }

      // Save reflection data to backend
      const token = await getIdTokenSafely();
      if (token) {
        await axios.post(`${backend_host}/api/project/${projectId}/ai-content-reflection`, 
          reflectionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Remove this reflection from pending list
      setPendingAIContentReflections(prev => prev.filter(r => r.id !== reflectionId));

      // Content handled silently - no additional completion message needed

    } catch (error) {
      console.error('❌ Error modifying AI content:', error);
    }
  }, [pendingAIContentReflections, projectId, buildStyledContent, getIdTokenSafely]);

  const handleDiscardAIContent = useCallback(async (reflectionData, reflectionId) => {
    try {
      // Don't insert content, just save reflection data
      const token = await getIdTokenSafely();
      if (token) {
        await axios.post(`${backend_host}/api/project/${projectId}/ai-content-reflection`, 
          reflectionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Remove this reflection from pending list
      setPendingAIContentReflections(prev => prev.filter(r => r.id !== reflectionId));

      // Content handled silently - no additional completion message needed

    } catch (error) {
      console.error('Error discarding AI content:', error);
    }
  }, [projectId, getIdTokenSafely]);

  return {
    write: performWriteTask,
    review: performReviewTask,
    suggest: performSuggestTask,
    addComment: addAIComment,
    insertAIText,
    isLoading: loadingAIs.size > 0,
    loadingAIs,
    taskCompletionMessages,
    clearCompletionMessages,
    removeCompletionMessage,
    // AI Content Reflection
    pendingAIContentReflections,
    handleAcceptAIContent,
    handleModifyAIContent,
    handleDiscardAIContent
  };
};
