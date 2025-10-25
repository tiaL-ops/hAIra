import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import axios from 'axios';

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
import TeamPanel from "../components/TeamPanel";
import TaskCompletionFeedback from "../components/TaskCompletionFeedback";
import SummarizePopup from "../components/SummarizePopup";
import ProofreadPopup from "../components/ProofreadPopup";
import { getChromeProofreadSuggestions, getChromeSummary, getChromeWriter } from "../utils/chromeAPI";
import { useAITeam } from "../hooks/useAITeam";
import { AI_TEAMMATES } from "../../../haira-server/config/aiAgents.js";
import "../styles/editor.css";
import "../styles/global.css";
import "../styles/TeamPanel.css";
import "../styles/TaskCompletionFeedback.css";
import "../styles/SummarizePopup.css";
import "../styles/ProofreadPopup.css";
//------------

const backend_host = "http://localhost:3002";

function Submission() {
  const { id } = useParams(); // project id
  const { currentUser } = useAuth();
  const auth = getAuth();
  const navigate = useNavigate(); // Navigate to logging page

  const [reportContent, setReportContent] = useState("");
  const [message, setMessage] = useState("...");
  const [saveStatus, setSaveStatus] = useState("Auto-saving…");
  const [isLoading, setIsLoading] = useState(false);

  const [comments, setComments] = useState([]); // Start with empty comments
  const [selectionRange, setSelectionRange] = useState(null);
  const [highlightedRanges, setHighlightedRanges] = useState([]); // Store highlighted text ranges
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
    performAITask, 
    isLoading: aiTaskLoading, 
    loadingAIs,
    taskCompletionMessages, 
    removeCompletionMessage 
  } = useAITeam(id, editorRef, handleAddAIComment);
  
  // Text selection state
  const [selectedText, setSelectedText] = useState("");

  // Load project data and draft content
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        const token = await auth.currentUser.getIdToken();
        
        const response = await axios.get(`${backend_host}/api/project/${id}/submission`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
        
      } catch (err) {
        console.error("Error fetching submission info:", err);
        setMessage("Error loading submission page");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmission();
  }, [id, navigate, auth]);

  // Autosave effect
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
            }
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
  function handleCommentResolve(commentId) {
    console.log('Resolving comment:', commentId);
    
    // Update comment as resolved
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, resolved: true }
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
        
        // Use the new command to remove highlight by commentId
        const success = editorRef.current.commands.removeHighlightByCommentId(commentId);
        console.log('Highlight removal success:', success);
      }
    }, 100);
  }

  // Handle adding new comment
  function handleAddComment(text) {
    console.log('Adding comment with text:', text);
    console.log('Current selectionRange:', selectionRange);
    
    // Try to capture current selection if none exists
    let currentSelection = selectionRange;
    if (!currentSelection) {
      currentSelection = captureCurrentSelection();
      console.log('Captured selection:', currentSelection);
    }
    
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      text,
      anchor: currentSelection?.text || null, // Use selected text if available, otherwise null
      createdAt: Date.now(),
      resolved: false,
      selection: currentSelection, // Store the full selection data
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
      // Call server-side AI fallback function
      const serverSideFallback = async () => {
        const token = await getIdTokenSafely();
        const res = await axios.post(`${backend_host}/api/project/${id}/ai/summarize`, 
          { content: reportContent },
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
          }
        );
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
      // Call server-side AI fallback function
      const serverSideFallback = async () => {
        const token = await getIdTokenSafely();
        const res = await axios.post(`${backend_host}/api/project/${id}/ai/proofread`, 
          { content: textToProofread },
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
          }
        );
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
  async function handleAssignAITask(aiType, taskType, sectionName) {
    console.log('handleAssignAITask called:', { aiType, taskType, sectionName });
    try {
      await performAITask(aiType, taskType, sectionName, reportContent);
    } catch (error) {
      console.error('AI task assignment failed:', error);
      setAiFeedback(`❌ AI task failed: ${error.message}`);
    }
  }

  // Handle submission
  async function handleSubmission() {
    if (!reportContent.trim()) {
      alert("Please write some content before submitting!");
      return;
    }

    if (!auth.currentUser) {
      alert("You must be logged in to submit a report.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getIdTokenSafely();
      const response = await axios.post(`${backend_host}/api/project/${id}/submission`, 
        { content: reportContent },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );
      
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
      // eslint-disable-next-line no-undef
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
        <AIToolbar
          onSummarize={handleAISummarize}
          onProofread={handleAIProofread}
          onSubmit={handleSubmission}
          submitting={submitting}
          submitted={submitted}
          saveStatus={saveStatus}
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
    </div>
  );
}

export default Submission;