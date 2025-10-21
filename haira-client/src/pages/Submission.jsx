import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import axios from 'axios';

// -- NEW --
import EditorToolbar from "../components/TextEditor/EditorToolbar";
import EditorArea from "../components/TextEditor/EditorArea";
import CommentSidebar from "../components/TextEditor/CommentSidebar";
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
  const [aiFeedback, setAiFeedback] = useState(null);
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
    if (!reportContent.trim() || !id || submitted) return;

    const timeout = setTimeout(async () => {
      try {
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
        
        setSaveStatus("Saved ✓");
      } catch (err) {
        setSaveStatus("Save failed");
        console.error("Draft save error", err);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [reportContent, id, submitted]);


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
    if (selectionData && selectionData.text) {
      setSelectionRange(selectionData);
      setSelectedText(selectionData.text);
      return;
    }
    // Don't clear selection immediately - only clear when explicitly needed
  }

  // Handle comment resolution
  function handleCommentResolve(commentId) {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, resolved: true }
          : comment
      )
    );
  }

  // Handle adding new comment
  function handleAddComment(text) {
    // Try to capture current selection if none exists
    let currentSelection = selectionRange;
    if (!currentSelection) {
      currentSelection = captureCurrentSelection();
    }
    
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      text,
      anchor: currentSelection?.text || null, // Use selected text if available, otherwise null
      createdAt: Date.now(),
      resolved: false,
    };
    
    setComments(prev => [newComment, ...prev]);
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

  // Function to capture current selection from contentEditable div
  function captureCurrentSelection() {
    if (!editorRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) return null;
    
    // Get position in plain text
    const plainText = reportContent;
    const start = plainText.indexOf(selectedText);
    const end = start + selectedText.length;
    
    const selectionData = { text: selectedText, start, end };
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

  async function handleAISuggest() {
    try {
      const token = await getIdTokenSafely();
      const res = await axios.post(`${backend_host}/api/project/${id}/ai/suggest`, 
        { content: reportContent },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );
      setAiFeedback(res.data?.suggestions || "No response.");
    } catch (err) {
      console.error("AI Suggest error", err);
      setAiFeedback("AI error: " + err.message);
    }
  }

  // Handle applying proofread suggestion
  function handleApplySuggestion(correctedText) {
    if (!selectionRange) return;
    
    const start = selectionRange.start;
    const end = selectionRange.end;
    const beforeText = reportContent.substring(0, start);
    const afterText = reportContent.substring(end);
    const newContent = beforeText + correctedText + afterText;
    
    setReportContent(newContent);
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
        <EditorToolbar
          onSummarize={handleAISummarize}
          onProofread={handleAIProofread}
          onSuggest={handleAISuggest}
          aiFeedback={aiFeedback}
        />
        
        <ChromeAIStatus />
        <EditorArea
          ref={editorRef}
          value={reportContent}
          onChange={setReportContent}
          onSelectionChange={handleTextSelection}
        />

        <div className="status-row">
          <div className="save-status">{saveStatus}</div>
          {!submitted ? (
            <button
              onClick={handleSubmission}
              disabled={submitting || !reportContent.trim()}
              className="submit-button"
            >
              {submitting ? "Submitting..." : "📤 Submit Report"}
            </button>
          ) : (
            <div className="submission-success">
              <h3>✅ Report Submitted Successfully!</h3>
              <p>Redirecting to results page...</p>
            </div>
          )}
        </div>
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
    </div>
  );
}

export default Submission;