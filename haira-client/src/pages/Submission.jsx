import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import axios from 'axios';

// -- NEW --
import AIToolbar from "../components/TextEditor/AIToolbar";
import EditorArea from "../components/TextEditor/EditorArea";
import CommentSidebar from "../components/TextEditor/CommentSidebar";
import EditorGuide from "../components/TextEditor/EditorGuide";
import ProofreadSuggestion from "../components/ProofreadSuggestion";
import ChromeAIStatus from "../components/ChromeAIStatus";
import { getChromeProofreadSuggestions, getChromeSummary } from "../utils/chromeAPI";
import "../styles/editor.css";
import "../styles/global.css";
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
  const editorRef = useRef(null);
  
  // Proofread suggestion modal state
  const [showProofreadSuggestion, setShowProofreadSuggestion] = useState(false);
  const [proofreadData, setProofreadData] = useState(null);
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
    try {
      setAiFeedback("🤖 Generating summary...");
      
      // Gemini fallback function
      const geminiFallback = async () => {
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
      const result = await getChromeSummary(reportContent, geminiFallback);
      
      const summary = result.summary || "No summary generated.";
      const source = result.source || 'unknown (chrome or gemini)';
      
      setAiFeedback(`📝 Summary (${source}):\n\n${summary}`);
      setAiSummary(summary);
    } catch (err) {
      console.error("AI Summarize error", err);
      setAiFeedback("❌ AI error: " + err.message);
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
    try {
      // First try to capture current selection from textarea
      let currentSelection = captureCurrentSelection();
      
      // Check if user has selected text (use stored selection or captured selection)
      const textToProofread = selectedText.trim() || (selectionRange?.text || '').trim() || (currentSelection?.text || '').trim();
      
      if (!textToProofread) {
        setAiFeedback("💡 Please select some text to proofread first!");
        return;
      }

      setAiFeedback("🔍 Checking selected text...");
      
      // Gemini fallback function
      const geminiFallback = async () => {
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
      const result = await getChromeProofreadSuggestions(textToProofread, geminiFallback);
      
      const source = result.source || 'unknown';
      
      if (result.hasErrors && result.corrected) {
        // Show interactive suggestion modal
        setProofreadData({
          originalText: textToProofread,
          correctedText: result.corrected,
          source: source,
          errorCount: result.errorCount
        });
        setShowProofreadSuggestion(true);
        setAiFeedback(`🔧 Found ${result.errorCount} issues in selected text (${source})`);
      } else if (result.hasErrors) {
        // Fallback for Gemini with individual corrections
        const corrections = result.corrections.map(c => 
          `• ${c.type}: "${c.originalText}" → "${c.suggestedText}"`
        ).join('\n');
        setAiFeedback(`🔧 Found ${result.errorCount} issues (${source}):\n\n${corrections}`);
      } else {
        setAiFeedback(`✅ No errors found in selected text! (${source})`);
      }
    } catch (err) {
      console.error("AI Proofread error", err);
      setAiFeedback("❌ AI error: " + err.message);
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
    setSelectionRange(null);
    setSelectedText("");
  }

  // Handle discarding proofread suggestion
  function handleDiscardSuggestion() {
    setAiFeedback("❌ Suggestion discarded");
    setSelectionRange(null);
    setSelectedText("");
  }

  // Handle closing proofread suggestion modal
  function handleCloseSuggestion() {
    setShowProofreadSuggestion(false);
    setProofreadData(null);
  }

  // Handle clearing AI feedback
  function handleClearFeedback() {
    setAiFeedback(null);
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
      <div className="main-editor">
        <AIToolbar
          onSummarize={handleAISummarize}
          onProofread={handleAIProofread}
          aiFeedback={aiFeedback}
          onShowGuide={() => setShowGuide(true)}
          onSubmit={handleSubmission}
          submitting={submitting}
          submitted={submitted}
          saveStatus={saveStatus}
          onClearFeedback={handleClearFeedback}
        />
        
        <ChromeAIStatus />
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

      {/* Proofread Suggestion Modal */}
      {showProofreadSuggestion && proofreadData && (
        <ProofreadSuggestion
          originalText={proofreadData.originalText}
          correctedText={proofreadData.correctedText}
          onApply={handleApplySuggestion}
          onDiscard={handleDiscardSuggestion}
          onClose={handleCloseSuggestion}
        />
      )}
      
      <EditorGuide 
        isVisible={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </div>
  );
}

export default Submission;