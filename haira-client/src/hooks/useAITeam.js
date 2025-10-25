import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';
import { getChromeWriter } from '../utils/chromeAPI.js';

const backend_host = "http://localhost:3002";

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

const resolveTeammate = (aiType) => AI_TEAMMATES[aiType] || AI_TEAMMATES.rasoa;

export const useAITeam = (projectId, editorRef, onAddComment = null) => {
  const [loadingAIs, setLoadingAIs] = useState(new Set());
  const [taskCompletionMessages, setTaskCompletionMessages] = useState([]);

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

    if (wordCount > 0 && projectId && taskType === 'write_section') {
      try {
        const token = await getIdTokenSafely();
        if (token) {
          console.log('📊 Tracking word count contribution...');
          await axios.post(`${backend_host}/api/project/${projectId}/word-contributions/track`, {
            contributorId: aiType,
            contributorName: name,
            contributorRole: role,
            wordCount,
            taskType
          }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
          console.log('✅ Word count tracked successfully');
        }
      } catch (error) {
        console.error('❌ Error tracking word count:', error);
      }
    }
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
        aiType: aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate), 
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
      
      console.log('📝 Client: Inserting AI text into editor...');
      insertAIText(htmlResponse, aiTeammate.id, 'write_section');
      console.log('✅ Client: AI text inserted successfully');
      
      // Generate completion message from API
      console.log('🔍 Debug aiTeammate:', aiTeammate);
      console.log('🔍 Debug aiTeammate.id:', aiTeammate.id);
      
      // Fix: Use aiTeammate.id or fallback to the key from AI_TEAMMATES
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
      console.log('🔍 Debug resolved aiType:', aiType);
      
      const generatedMessage = await generateCompletionMessage(aiType, 'write');
      console.log('🔍 Debug generatedMessage:', generatedMessage);
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: generatedMessage,
        timestamp: Date.now()
      };
      console.log('📝 Adding completion message:', completionMessage);
      setTaskCompletionMessages(prev => {
        const newMessages = [...prev, completionMessage];
        console.log('📝 New completion messages:', newMessages);
        return newMessages;
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setTaskCompletionMessages(prev => prev.filter(msg => msg.id !== completionMessage.id));
      }, 5000);
      
      return result;
      
    } catch (error) {
      console.error('❌ Chrome Writer failed, using server fallback:', error);
      const fallbackResult = await serverFallback();
      
      const htmlResponse = convertMarkdownToHTML(fallbackResult.content);
      console.log('🔄 Client: Converted fallback to HTML:', htmlResponse?.substring(0, 100) + '...');
      
      console.log('📝 Client: Inserting fallback AI text into editor...');
      insertAIText(htmlResponse, aiTeammate.id, 'write_section');
      console.log('✅ Client: Fallback AI text inserted successfully');
      
      // Generate completion message from API
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
      const generatedMessage = await generateCompletionMessage(aiType, 'write');
      const completionMessage = {
        id: Date.now(),
        aiType: aiType,
        message: generatedMessage,
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
        aiType: aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate), 
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
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
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
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
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
        aiType: aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate), 
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
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
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
      const aiType = aiTeammate.id || Object.keys(AI_TEAMMATES).find(key => AI_TEAMMATES[key] === aiTeammate);
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
  };
};
