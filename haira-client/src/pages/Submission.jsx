import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '../App';
import { auth, serverFirebaseAvailable } from '../../firebase';
import axios from 'axios';

// Helper function to retry axios requests on network errors
const axiosWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
      
      if (isNetworkError && !isLastRetry) {
        console.log(`[Retry ${i + 1}/${maxRetries}] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Import agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

// -- NEW --
import AIToolbar from "../components/TextEditor/AIToolbar";
import EditorArea from "../components/TextEditor/EditorArea";
import CommentSidebar from "../components/TextEditor/CommentSidebar";
import EditorGuide from "../components/TextEditor/EditorGuide";
import AIContentReflectionModal from "../components/AIContentReflectionModal";
import TeamPanel from "../components/TeamPanel";
import TaskCompletionFeedback from "../components/TaskCompletionFeedback";
import SummarizePopup from "../components/SummarizePopup";
import ProofreadPopup from "../components/ProofreadPopup";
import { getChromeProofreadSuggestions, getChromeSummary, getChromeWriter } from "../utils/chromeAPI";
import { useAITeam } from "../hooks/useAITeam";
import { getAIAgents } from "../services/aiAgentsService.js";
import "../styles/editor.css";
import "../styles/global.css";
import "../styles/TeamPanel.css";
import "../styles/TaskCompletionFeedback.css";
import "../styles/SummarizePopup.css";
import "../styles/ProofreadPopup.css";
//------------

const backend_host = import.meta.env.VITE_BACKEND_HOST;

function Submission() {
  const { id } = useParams(); // project id
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // Navigate to logging page

  const [reportContent, setReportContent] = useState("");
  const [message, setMessage] = useState("...");
  const [saveStatus, setSaveStatus] = useState("Auto-saving…");
  const [commentSaveStatus, setCommentSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [comments, setComments] = useState([]); // Start with empty comments
  const [selectionRange, setSelectionRange] = useState(null);
  const [highlightedRanges, setHighlightedRanges] = useState([]); // Store highlighted text ranges
  const [aiAgents, setAiAgents] = useState({ AI_TEAMMATES: {} });
  const [loading, setLoading] = useState(true);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Popup states
  const [showSummarizePopup, setShowSummarizePopup] = useState(false);
  const [showProofreadPopup, setShowProofreadPopup] = useState(false);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [proofreadLoading, setProofreadLoading] = useState(false);
  const [summarizeError, setSummarizeError] = useState(null);
  const [proofreadError, setProofreadError] = useState(null);
  const editorRef = useRef(null);
  
  // Debug states
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [testTeammate, setTestTeammate] = useState('rasoa'); // Default test teammate
  
  // Data states
  const [proofreadData, setProofreadData] = useState(null);
  const [summarizeData, setSummarizeData] = useState(null);
  
  // Function to clear text selection
  const clearTextSelection = () => {
    if (editorRef.current) {
      const editor = editorRef.current;
      // Clear any text selection in the editor
      editor.commands.setTextSelection({ from: 0, to: 0 });
    }
    setSelectionRange(null);
    setSelectedText("");
  };
  
  
  
  // Team collaboration state
  const [teamContext, setTeamContext] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]); // Tasks from Kanban
  
  // Function to add AI comments to sidebar
  const handleAddAIComment = useCallback((text, type, author) => {
    const newComment = {
      id: Date.now() + Math.random(),
      author: author,
      text: text,
      type: type, // 'review' or 'suggestion'
      createdAt: Date.now(),
      resolved: false,
    };
    setComments((c) => [newComment, ...c]);
  }, []);

  // AI Team hook
  const { 
    write, 
    review, 
    suggest,
    isLoading: aiTaskLoading, 
    loadingAIs,
    taskCompletionMessages, 
    removeCompletionMessage,
    // AI Content Reflection
    pendingAIContentReflections,
    handleAcceptAIContent,
    handleModifyAIContent,
    handleDiscardAIContent
  } = useAITeam(id, editorRef, handleAddAIComment);
  
  // Text selection state
  const [selectedText, setSelectedText] = useState("");

  // Load AI agents
  useEffect(() => {
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAiAgents(agents);
      } catch (error) {
        console.error('Error loading AI agents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAIAgents();
  }, []);

  // Load project data and draft content
  useEffect(() => {
    const fetchSubmission = async () => {
      // Check authentication with fallback
      const checkAuth = () => {
        if (serverFirebaseAvailable) {
          return auth.currentUser;
        } else {
          // Check localStorage for user
          const storedUser = localStorage.getItem('__localStorage_current_user__');
          return storedUser ? JSON.parse(storedUser) : null;
        }
      };
      
      const currentUser = checkAuth();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Get token with fallback
        let token;
        if (serverFirebaseAvailable) {
          token = await auth.currentUser.getIdToken();
        } else {
          // Generate mock token for localStorage
          token = `mock-token-${currentUser.uid}-${Date.now()}`;
        }
        
        const response = await axios.get(`${backend_host}/api/project/${id}/submission`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });
        
        const data = response.data;
        setMessage(data.message || `Submission Page Loaded!`);
        setProjectData(data.project);
        
        // Setup team context from teammates subcollection
        const teammates = data.teammates || {};
        const team = data.project?.team || [];
        
        // Filter AI teammates
        const aiTeammates = team.filter(member => member.type === 'ai');
        
        console.log('📥 Teammates loaded from backend:', teammates);
        console.log('🤖 AI teammates:', aiTeammates);
        
        // Set team context with the actual teammates
        setTeamContext(team);
        
        // Load pending tasks from Kanban
        await fetchPendingTasks(token);
        
        // Load draft content if available
        if (data.project?.draftReport?.content) {
          setReportContent(data.project.draftReport.content);
          setSaveStatus(`Last saved: ${new Date(data.project.draftReport.lastSaved).toLocaleTimeString()}`);
        } else if (data.project?.finalReport?.content) {
          // If already submitted, show final report
          setReportContent(data.project.finalReport.content);
          setSubmitted(true);
          setSaveStatus("Report already submitted");
        }

        // Load comments from the main response
        const savedComments = data.project?.comments || [];
        if (savedComments.length > 0) {
          setComments(savedComments);
          
          // Restore highlighted ranges from saved comments
          const highlights = savedComments
            .filter(comment => comment.selection && !comment.resolved)
            .map(comment => ({
              id: `highlight-${comment.id}`,
              commentId: comment.id,
              start: comment.selection.start,
              end: comment.selection.end,
              text: comment.selection.text
            }));
          
          setHighlightedRanges(highlights);
          
          // Apply highlights to editor after a short delay
          setTimeout(() => {
            if (editorRef.current && highlights.length > 0) {
              highlights.forEach(highlight => {
                editorRef.current.commands.setTextSelection({ 
                  from: highlight.start, 
                  to: highlight.end 
                });
                editorRef.current.commands.setHighlight({ 
                  commentId: highlight.commentId 
                });
              });
            }
          }, 500);
        }
      } catch (err) {
        console.error("Error fetching submission info:", err);
        setMessage("Error loading submission page");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmission();
  }, [id, navigate]);

  // Fetch pending tasks from Kanban
  const fetchPendingTasks = async (token) => {
    try {
      const response = await axios.get(`${backend_host}/api/project/${id}/kanban`, {
        headers: {
          'Authorization': `Bearer ${token || await getIdTokenSafely()}`
        },
        timeout: 10000
      });
      
      if (response.data.success) {
        // List of valid AI teammate IDs
        const aiTeammateIds = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto', 'ai_manager', 'ai_helper'];
        
        // Filter for AI tasks that are in "todo" status
        // Only include tasks assigned to known AI teammates
        const aiTasks = response.data.tasks?.filter(task => {
          const isAITask = task.assignedTo && aiTeammateIds.includes(task.assignedTo.toLowerCase());
          const isTodoStatus = task.status === 'todo';
          return isAITask && isTodoStatus;
        }) || [];
        
        console.log('[Submission] All tasks:', response.data.tasks);
        console.log('[Submission] Filtered pending AI tasks:', aiTasks);
        setPendingTasks(aiTasks);
      }
    } catch (err) {
      console.error('[Submission] Error fetching pending tasks:', err);
    }
  };

  // Add comment auto-save effect
  useEffect(() => {
    if (comments.length === 0) return; // Don't save empty comments
    
    const timeout = setTimeout(async () => {
      try {
        setCommentSaveStatus("Saving comments...");
        const token = await getIdTokenSafely();
        
        await axios.post(`${backend_host}/api/project/${id}/comments`, 
          { comments },
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            timeout: 10000
          }
        );
        
        console.log('Comments auto-saved successfully');
        setCommentSaveStatus("Comments saved ✓");
        setTimeout(() => setCommentSaveStatus(""), 2000);
      } catch (err) {
        console.error("Comments save error", err);
        setCommentSaveStatus("Comments save failed");
        setTimeout(() => setCommentSaveStatus(""), 3000);
      }
    }, 3000); // Save comments 3 seconds after last change

    return () => clearTimeout(timeout);
  }, [comments, id]);

  // Autosave Report content effect
  useEffect(() => {
    // Don't auto-save if no project ID, already submitted, or no content
    if (!id || submitted) {
      console.log('Auto-save skipped: no id or already submitted');
      return;
    }

    // Don't auto-save empty content on initial load
    if (!reportContent.trim() && saveStatus === "Auto-saving…") {
      console.log('Auto-save skipped: empty content on initial load');
      return;
    }

    console.log('Auto-save triggered for content:', reportContent.substring(0, 50) + '...');

    const timeout = setTimeout(async () => {
      try {
        console.log('Auto-saving...');
        setSaveStatus("Saving...");
        const token = await getIdTokenSafely();
        
        await axios.post(`${backend_host}/api/project/${id}/submission/draft`, 
          { content: reportContent },
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            timeout: 10000
          }
        );
        
        console.log('Auto-save successful');
        setSaveStatus("Saved ✓");
      } catch (err) {
        console.error("Draft save error", err);
        setSaveStatus("Save failed");
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [reportContent, id, submitted, saveStatus]);


  // Add Comment for selected text
  function addCommentForSelection(author = "You", text = "") {
    // Try to capture current selection if none exists
    let currentSelection = selectionRange;
    if (!currentSelection) {
      currentSelection = captureCurrentSelection();
    }
    
    if (!currentSelection || !currentSelection.text) return;
    
    const newComment = {
      id: Date.now().toString(),
      author,
      text,
      anchor: currentSelection.text,
      createdAt: Date.now(),
      resolved: false,
    };
    setComments((c) => [newComment, ...c]);
    // clear selection after adding
    setSelectionRange(null);
    setSelectedText("");
    if (editorRef.current) editorRef.current.focus();
  }

  // Handle text selection from text editor
  function handleTextSelection(selectionData) {
    console.log('handleTextSelection called with:', selectionData);
    if (selectionData && selectionData.text) {
      setSelectionRange(selectionData);
      setSelectedText(selectionData.text);
      return;
    }
    // Don't clear selection immediately - only clear when explicitly needed
  }

  // Handle comment resolution
  // Update the existing handleCommentResolve function
// Update the existing handleCommentResolve function
    function handleCommentResolve(commentId) {
      console.log('Resolving comment:', commentId);
      
      // Update comment as resolved
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, resolved: true, updatedAt: Date.now() }
            : comment
        )
      );
      
      // Remove highlight for this comment
      setHighlightedRanges(prev => {
        const updated = prev.filter(range => range.commentId !== commentId);
        console.log('Removed highlight for comment:', commentId, 'Remaining highlights:', updated);
        return updated;
      });
      
      // Also remove highlight from editor immediately
      setTimeout(() => {
        if (editorRef.current) {
          console.log('Removing highlight from editor for comment:', commentId);
          const success = editorRef.current.commands.removeHighlightByCommentId(commentId);
          console.log('Highlight removal success:', success);
        }
      }, 100);
    }

  // Handle adding new comment
  function handleAddComment(text) {
    console.log('Adding comment with text:', text);
    
    let currentSelection = selectionRange;
    if (!currentSelection) {
      currentSelection = captureCurrentSelection();
      console.log('Captured selection:', currentSelection);
    }
    
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      text,
      anchor: currentSelection?.text || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
      selection: currentSelection,
    };
    
    console.log('New comment:', newComment);
    setComments(prev => [newComment, ...prev]);
    
    // If there's a selection, add it to highlighted ranges
    if (currentSelection) {
      const highlightId = `highlight-${newComment.id}`;
      const newHighlight = {
        id: highlightId,
        commentId: newComment.id,
        start: currentSelection.start,
        end: currentSelection.end,
        text: currentSelection.text
      };
      console.log('Adding highlight:', newHighlight);
      setHighlightedRanges(prev => {
        const updated = [...prev, newHighlight];
        console.log('Updated highlightedRanges:', updated);
        return updated;
      });
      
      // Also try to apply the highlight immediately
      setTimeout(() => {
        if (editorRef.current) {
          console.log('Manually applying highlight immediately...');
          editorRef.current.commands.setTextSelection({ from: currentSelection.start, to: currentSelection.end });
          const success = editorRef.current.commands.setHighlight({ commentId: newComment.id });
          console.log('Manual highlight success:', success);
        }
      }, 200);
    } else {
      console.log('No selection found, not adding highlight');
    }
    
    setSelectionRange(null); // Clear selection after adding comment
    setSelectedText(""); // Also clear selected text
  }

  // AI toolbar callbacks
  async function handleAISummarize() {
    setShowSummarizePopup(true);
    setSummarizeLoading(true);
    setSummarizeError(null);
    
    try {
      // Call server-side AI fallback function with retry logic
      const serverSideFallback = async () => {
        const token = await getIdTokenSafely();
        const res = await axiosWithRetry({
          method: 'post',
          url: `${backend_host}/api/project/${id}/ai/summarize`,
          data: { content: reportContent },
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 10000
        });
        return {
          summary: res.data?.result || res.data?.summary || "No summary returned.",
          source: 'gemini'
        };
      };

      // Try Chrome AI first, fallback to Gemini
      const result = await getChromeSummary(reportContent, serverSideFallback);
      
      const summary = result.summary || "No summary generated.";
      const source = result.source || 'unknown (chrome or gemini)';
      
      setSummarizeData({
        summary: summary,
        source: source
      });
    } catch (err) {
      console.error("AI Summarize error", err);
      setSummarizeError("AI error: " + err.message);
    } finally {
      setSummarizeLoading(false);
    }
  }

  // Function to capture current selection from TipTap editor
  function captureCurrentSelection() {
    if (!editorRef.current) return null;
    
    const editor = editorRef.current;
    const { from, to } = editor.state.selection;
    
    if (from === to) return null; // No selection
    
    const selectedText = editor.state.doc.textBetween(from, to);
    
    if (!selectedText.trim()) return null;
    
    const selectionData = { text: selectedText, start: from, end: to };
    setSelectionRange(selectionData);
    setSelectedText(selectedText);
    
    return selectionData;
  }

  async function handleAIProofread() {
    // First try to capture current selection from textarea
    let currentSelection = captureCurrentSelection();
    
    // Check if user has selected text (use stored selection or captured selection)
    const textToProofread = selectedText.trim() || (selectionRange?.text || '').trim() || (currentSelection?.text || '').trim();
    
    if (!textToProofread) {
      setProofreadError("Please select some text to proofread first!");
      setShowProofreadPopup(true);
      return;
    }

    setShowProofreadPopup(true);
    setProofreadLoading(true);
    setProofreadError(null);
    
    try {
      // Call server-side AI fallback function with retry logic
      const serverSideFallback = async () => {
        const token = await getIdTokenSafely();
        const res = await axiosWithRetry({
          method: 'post',
          url: `${backend_host}/api/project/${id}/ai/proofread`,
          data: { content: textToProofread },
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 10000
        });
        return {
          corrections: res.data?.corrections || res.data?.proofread || "No response.",
          source: 'gemini'
        };
      };

      // Try Chrome AI first, fallback to Gemini
      const result = await getChromeProofreadSuggestions(textToProofread, serverSideFallback);
      
      const source = result.source || 'unknown';
      
      if (result.hasErrors && result.corrected) {
        // Show interactive suggestion popup
        setProofreadData({
          originalText: textToProofread,
          correctedText: result.corrected,
          source: source,
          errorCount: result.errorCount,
          suggestions: result.corrections ? result.corrections.map(c => ({
            type: c.type || 'Grammar',
            issue: `"${c.originalText}"`,
            suggestion: `"${c.suggestedText}"`,
            explanation: `This is a ${c.type || 'grammar'} correction.`,
            confidence: 85
          })) : []
        });
      } else if (result.hasErrors) {
        // Fallback for Gemini with individual corrections
        setProofreadData({
          originalText: textToProofread,
          source: source,
          errorCount: result.errorCount,
          suggestions: result.corrections ? result.corrections.map(c => ({
            type: c.type || 'Grammar',
            issue: `"${c.originalText}"`,
            suggestion: `"${c.suggestedText}"`,
            explanation: `This is a ${c.type || 'grammar'} correction.`,
            confidence: 85
          })) : []
        });
      } else {
        setProofreadData({
          originalText: textToProofread,
          source: source,
          errorCount: 0,
          suggestions: []
        });
      }
    } catch (err) {
      console.error("AI Proofread error", err);
      setProofreadError("AI error: " + err.message);
    } finally {
      setProofreadLoading(false);
    }
  }


  // Handle applying proofread suggestion
  function handleApplySuggestion(correctedText) {
    if (!selectionRange) return;
    
    const start = selectionRange.start;
    const end = selectionRange.end;
    
    // Update the content state
    const beforeText = reportContent.substring(0, start);
    const afterText = reportContent.substring(end);
    const newContent = beforeText + correctedText + afterText;
    
    setReportContent(newContent);
    
    // Also update the TipTap editor directly to ensure it reflects the change
    if (editorRef.current) {
      try {
        // Set the selection in the editor
        editorRef.current.commands.setTextSelection({ from: start, to: end });
        // Replace the selected text with the corrected text
        editorRef.current.commands.insertContent(correctedText);
        // Clear the selection
        editorRef.current.commands.setTextSelection({ from: start + correctedText.length, to: start + correctedText.length });
      } catch (error) {
        console.error('Error updating editor:', error);
        // Fallback: just update the content state
        console.log('Using fallback content update');
      }
    }
    
    setAiFeedback("✅ Suggestion applied successfully!");
    
    // Clear selection
    clearTextSelection();
  }

  // Handle discarding proofread suggestion
  function handleDiscardSuggestion() {
    setAiFeedback("❌ Suggestion discarded");
    clearTextSelection();
  }


  // Handle clearing AI feedback
  function handleClearFeedback() {
    setAiFeedback(null);
  }

  // Handle AI task assignment
  async function handleAssignAITask(aiType, taskType, sectionName, isExistingTask = false, existingTaskId = null) {
    console.log('handleAssignAITask called:', { aiType, taskType, sectionName, isExistingTask, existingTaskId });
  
    try {
      // Debug: Log the aiType and available keys
      console.log('🔍 Debug aiType:', aiType);
      console.log('🔍 Debug AI_TEAMMATES keys:', Object.keys(aiAgents.AI_TEAMMATES));
      console.log('🔍 Debug AI_TEAMMATES[aiType]:', aiAgents.AI_TEAMMATES[aiType]);
      
      const aiTeammate = {
        ...(aiAgents.AI_TEAMMATES[aiType] || aiAgents.AI_TEAMMATES.rasoa),
        id: aiType // Ensure id is preserved
      };
      console.log('🔍 Debug selected aiTeammate:', aiTeammate);
      
      // Create task description based on task type and section
      let taskDescription = '';
      if (taskType === 'write' || taskType === 'write_section') {
        taskDescription = sectionName ? `write ${sectionName}` : 'write content';
      } else if (taskType === 'review' || taskType === 'review_content') {
        taskDescription = sectionName ? `review ${sectionName}` : 'review content';
      } else if (taskType === 'suggest' || taskType === 'suggest_improvements') {
        taskDescription = sectionName ? `suggest improvements for ${sectionName}` : 'suggest improvements';
      }
      
      // Only create task if NOT clicking an existing pending task
      if (taskDescription && !isExistingTask) {
        console.log('[handleAssignAITask] Creating NEW task in Kanban');
        await syncTasksToKanban([{ description: taskDescription, assignedTo: aiType }], false, 'todo'); // Create as "todo"
      } else if (isExistingTask) {
        console.log('[handleAssignAITask] Task already exists - will just update to done after execution');
      }
  
      // Execute the AI task
      if (taskType === 'write' || taskType === 'write_section') {
        await write(aiTeammate, sectionName, reportContent, projectData?.title);
      } else if (taskType === 'review' || taskType === 'review_content') {
        await review(aiTeammate, reportContent);
      } else if (taskType === 'suggest' || taskType === 'suggest_improvements') {
        await suggest(aiTeammate, reportContent);
      } else {
        console.warn(`Unknown taskType: ${taskType}`);
        setAiFeedback(`⚠️ Unknown AI task: ${taskType}`);
        return;
      }
  
      setAiFeedback(`✅ ${aiTeammate.name} completed ${taskType.replace('_', ' ')} task`);
      
      // Update task to "done" in Kanban after completion
      if (taskDescription) {
        console.log('[handleAssignAITask] Updating task to done');
        // If we have the existing task id, send it so server updates by id (more reliable)
        const payloadTask = existingTaskId ? { id: existingTaskId, description: taskDescription, assignedTo: aiType } : { description: taskDescription, assignedTo: aiType };
        await syncTasksToKanban([ payloadTask ], false, 'done'); // Update to "done"
        
        // Refresh pending tasks list to remove completed task
        const token = await getIdTokenSafely();
        await fetchPendingTasks(token);
      }
    } catch (error) {
      console.error('AI task assignment failed:', error);
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        setAiFeedback(`🔌 Connection failed. Please refresh the page and try again.`);
      } else {
        setAiFeedback(`❌ AI task failed: ${error.message}`);
      }
    }
  }

  // Sync tasks to Kanban
  async function syncTasksToKanban(tasks, showAlert = false, status = 'done') {
    if (!tasks || tasks.length === 0) {
      console.warn('[syncTasks] No tasks provided');
      if (showAlert) {
        alert("No tasks found to sync.");
      }
      return null;
    }
    
    console.log('[syncTasks] ===== SYNC CALL =====');
    console.log('[syncTasks] Status:', status);
    console.log('[syncTasks] Tasks:', JSON.stringify(tasks, null, 2));
    
    try {
      const token = await getIdTokenSafely();
      console.log('[syncTasks] Token obtained:', !!token);
      
      const response = await axiosWithRetry({
        method: 'post',
        url: `${backend_host}/api/project/${id}/sync-tasks`,
        data: { tasks, status },
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000
      });
      
      console.log('[syncTasks] ✅ Response:', response.data);
      console.log('[syncTasks] ===== END SYNC =====');
      return response.data;
    } catch (err) {
      console.error('[syncTasks] ❌ Error:', err.response?.data || err.message);
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        console.error('[syncTasks] ❌ Network connection failed after retries. Please check if server is running.');
      }
      throw err;
    }
  }

  // Handle submission
  async function handleSubmission() {
    if (!reportContent.trim()) {
      alert("Please write some content before submitting!");
      return;
    }

    // Check authentication with fallback
    const checkAuth = () => {
      if (serverFirebaseAvailable) {
        return auth.currentUser;
      } else {
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        return storedUser ? JSON.parse(storedUser) : null;
      }
    };
    
    if (!checkAuth()) {
      alert("You must be logged in to submit a report.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getIdTokenSafely();
      
      // Submit the report with retry logic
      const response = await axiosWithRetry({
        method: 'post',
        url: `${backend_host}/api/project/${id}/submission`,
        data: { content: reportContent },
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000
      });
      
      setSubmitted(true);
      
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate(`/project/${id}/success`);
      }, 2000);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  // Utility to get token without assuming code structure; if getAuth not available it gracefully continues unauthenticated
  async function getIdTokenSafely() {
    try {
      if (serverFirebaseAvailable) {
        if (auth && auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      } else {
        // Use localStorage fallback
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          return `mock-token-${currentUser.uid}-${Date.now()}`;
        }
      }
    } catch (err) {
      // ignore; return null
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="editor-container">
        <div className="loading-state">
          <h2>Loading your project...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container" onMouseUp={handleTextSelection}>
      {/* Task Completion Feedback */}
      <TaskCompletionFeedback 
        messages={taskCompletionMessages}
        onRemoveMessage={removeCompletionMessage}
      />
      
      <div className="main-editor">
          {/* Navigation Buttons */}
          <div className="page-navigation-buttons">
            <button 
              onClick={() => navigate(`/project/${id}/kanban`)}
              className="nav-btn nav-btn-kanban"
              title="Go to Kanban Board"
            >
              Kanban
            </button>
            <button 
              onClick={() => navigate(`/project/${id}/chat`)}
              className="nav-btn nav-btn-chat"
              title="Go to Chat"
            >
              Chat
            </button>
          </div>
        
        <AIToolbar
          onSummarize={handleAISummarize}
          onProofread={handleAIProofread}
          onSubmit={handleSubmission}
          submitting={submitting}
          submitted={submitted}
          saveStatus={saveStatus}
          commentSaveStatus={commentSaveStatus}
        />
        
        
        {/* Project Title */}
        {projectData && (
          <div className="project-title-header">
            <h1 className="project-title">{projectData.title || 'Untitled Project'}</h1>
            {projectData.description && (
              <p className="project-description">{projectData.description}</p>
            )}
          </div>
        )}
        
        <EditorArea
          content={reportContent}
          onChange={setReportContent}
          editorRef={editorRef}
          highlightedRanges={highlightedRanges}
          onHighlightClick={(commentId) => {
            // Scroll to comment in sidebar
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />

      </div>

      <div className="right-sidebar">
        {/* Pending Tasks Section */}
        {pendingTasks.length > 0 && (
          <div className="pending-tasks-panel">
            <h3>Pending Tasks</h3>
            <div className="pending-tasks-list">
              {pendingTasks.map((task) => {
                // Find the teammate for this task
                const teammate = teamContext?.find(m => 
                  (m.id || m.name?.toLowerCase()) === task.assignedTo
                );
                const aiAgent = aiAgents.AI_TEAMMATES[task.assignedTo];
                
                // Get avatar mapping
                const avatarMap = {
                  brown: BrownAvatar,
                  elza: ElzaAvatar,
                  kati: KatiAvatar,
                  steve: SteveAvatar,
                  sam: SamAvatar,
                  rasoa: RasoaAvatar,
                  rakoto: RakotoAvatar
                };
                
                const avatarSrc = avatarMap[task.assignedTo];
                
                // Parse task description to get task type and section
                const taskDesc = task.description || task.title || '';
                let taskType = 'write';
                let sectionName = '';
                
                if (taskDesc.toLowerCase().includes('review')) {
                  taskType = 'review';
                  sectionName = taskDesc.replace(/review\s*/i, '').trim();
                } else if (taskDesc.toLowerCase().includes('suggest')) {
                  taskType = 'suggest';
                  sectionName = taskDesc.replace(/suggest\s*(improvements\s*for\s*)?/i, '').trim();
                } else if (taskDesc.toLowerCase().includes('write')) {
                  taskType = 'write';
                  sectionName = taskDesc.replace(/write\s*/i, '').trim();
                }
                
                return (
                  <div 
                    key={task.id} 
                    className="pending-task-item clickable"
                    onClick={() => {
                      // Pass true as 4th param to indicate this is an existing task
                      // and pass the task id so backend can update by id
                      handleAssignAITask(task.assignedTo, taskType, sectionName, true, task.id);
                    }}
                    title={`Click to start: ${taskDesc}`}
                  >
                    <div className="task-avatar" style={{ backgroundColor: aiAgent?.color || '#607D8B' }}>
                      {avatarSrc ? (
                        <img 
                          src={avatarSrc} 
                          alt={teammate?.name || task.assignedTo}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {teammate?.name ? teammate.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                    <div className="task-details">
                      <div className="task-description">{taskDesc}</div>
                    </div>
                    <div className="task-action">▶</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Team Panel - positioned above CommentSidebar */}
        {teamContext && (
          <TeamPanel
            onAssignTask={handleAssignAITask}
            loadingAIs={loadingAIs}
            teamMembers={teamContext}
          />
        )}
        
        <CommentSidebar
          comments={comments}
          hasSelection={!!selectionRange}
          onReply={(commentId, replyText) => {
            setComments((prev) =>
              prev.map((c) =>
                c.id === commentId ? { ...c, replies: [...(c.replies || []), { text: replyText, author: "You", at: Date.now() }] } : c
              )
            );
          }}
          onAddComment={handleAddComment}
          onResolve={handleCommentResolve}
          onHighlightClick={(commentId) => {
            // Find the highlight range for this comment
            const highlightRange = highlightedRanges.find(range => range.commentId === commentId);
            if (highlightRange) {
              // Scroll to the highlighted text in the editor
              const highlightElement = document.querySelector(`[data-comment-id="${commentId}"]`);
              if (highlightElement) {
                highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary flash effect
                highlightElement.style.backgroundColor = '#ff9800';
                setTimeout(() => {
                  highlightElement.style.backgroundColor = '#ffeb3b';
                }, 1000);
              }
            }
          }}
        />
      </div>

      <EditorGuide 
        isVisible={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
      
      {/* Summarize Popup */}
      <SummarizePopup
        isOpen={showSummarizePopup}
        onClose={() => setShowSummarizePopup(false)}
        summary={summarizeData?.summary}
        isLoading={summarizeLoading}
        error={summarizeError}
      />
      
      {/* Proofread Popup */}
      <ProofreadPopup
        isOpen={showProofreadPopup}
        onClose={() => {
          setShowProofreadPopup(false);
          clearTextSelection();
        }}
        proofreadData={proofreadData}
        isLoading={proofreadLoading}
        error={proofreadError}
        onApply={handleApplySuggestion}
        onDiscard={handleDiscardSuggestion}
      />

      {/* AI Content Reflection Modals - Multiple modals for multiple pending reflections */}
      {pendingAIContentReflections.map((reflection) => (
        <AIContentReflectionModal
          key={reflection.id}
          isOpen={reflection.isOpen}
          aiContent={reflection.content}
          aiTeammate={reflection.aiTeammate}
          aiCompletionMessage={reflection.aiCompletionMessage}
          onAccept={(reflectionData) => handleAcceptAIContent(reflectionData, reflection.id)}
          onModify={(reflectionData) => handleModifyAIContent(reflectionData, reflection.id)}
          onDiscard={(reflectionData) => handleDiscardAIContent(reflectionData, reflection.id)}
          isLoading={aiTaskLoading}
        />
      ))}
    </div>
  );
}

export default Submission;