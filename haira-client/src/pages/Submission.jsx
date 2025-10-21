import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';

// -- NEW --
import EditorToolbar from "../components/TextEditor/EditorToolbar";
import EditorArea from "../components/TextEditor/EditorArea";
import CommentSidebar from "../components/TextEditor/CommentSidebar";
import "../components/TextEditor/editor.css";
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

  const [comments, setComments] = useState([
    {
      id: "1",
      author: "AI Alex",
      text: "Great introduction! Consider adding more specific examples to support your main points.",
      anchor: "This project explores the impact of AI on education...",
      createdAt: Date.now() - 3600000, // 1 hour ago
      resolved: false,
      replies: [
        {
          text: "Thanks for the feedback! I'll add more examples.",
          author: "You",
          at: Date.now() - 1800000 // 30 minutes ago
        }
      ]
    },
    {
      id: "2", 
      author: "You",
      text: "Need to double-check the methodology section for accuracy.",
      anchor: null, // General comment
      createdAt: Date.now() - 7200000, // 2 hours ago
      resolved: true
    }
  ]); // local-only comments
  const [selectionRange, setSelectionRange] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef(null);

  // Optional: fetch project info
  useEffect(() => {
      const fetchSubmission = async () => {
        if (!auth.currentUser) {
            navigate('/login');
            return;
        }
        try{
          const token = await auth.currentUser.getIdToken();
                    
          const response = await axios.get(`${backend_host}/api/project/${id}/submission`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          if (response.data.message) {
            setMessage(response.data.message || `Submission Page Loaded!`);
          } else {
              setMessage("No message found");
          }
        } catch (err) {
            console.error("Error fetching submission info:", err);
            setMessage("Error loading submission page");
        }
      };
      fetchSubmission();
  }, [id, navigate, auth]);


  // Add Comment for selected text
  function addCommentForSelection(author = "You", text = "") {
    if (!selectionRange || !selectionRange.text) return;
    const newComment = {
      id: Date.now().toString(),
      author,
      text,
      anchor: selectionRange.text,
      createdAt: Date.now(),
      resolved: false,
    };
    setComments((c) => [newComment, ...c]);
    // clear selection after adding
    setSelectionRange(null);
    if (editorRef.current) editorRef.current.focus();
  }

  // Handle text selection from text editor
  function handleTextSelection(selectionData) {
    if (selectionData && selectionData.text) {
      setSelectionRange(selectionData);
      return;
    }
    setSelectionRange(null);
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
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      text,
      anchor: selectionRange?.text || null, // Use selected text if available, otherwise null
      createdAt: Date.now(),
      resolved: false,
    };
    
    setComments(prev => [newComment, ...prev]);
    setSelectionRange(null); // Clear selection after adding comment
  }

  // AI toolbar callbacks
  async function handleAISummarize() {
    try {
      const token = await getIdTokenSafely();
      const res = await fetch(`${backend_host}/api/project/${id}/ai/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: reportContent }),
      });
      const data = await res.json();
      const summary = data?.result || data?.summary || "No summary returned.";
      setAiFeedback(summary);
      setAiSummary(summary); // Also update the summary in the Summary & Reflection section
    } catch (err) {
      console.error("AI Summarize error", err);
      setAiFeedback("AI error: " + err.message);
    }
  }

  async function handleAIProofread() {
    try {
      const token = await getIdTokenSafely();
      const res = await fetch(`${backend_host}/api/project/${id}/ai/proofread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: reportContent }),
      });
      const data = await res.json();
      setAiFeedback(data?.corrections || data?.proofread || "No response.");
    } catch (err) {
      console.error("AI Proofread error", err);
      setAiFeedback("AI error: " + err.message);
    }
  }

  async function handleAISuggest() {
    try {
      const token = await getIdTokenSafely();
      const res = await fetch(`${backend_host}/api/project/${id}/ai/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: reportContent }),
      });
      const data = await res.json();
      setAiFeedback(data?.suggestions || "No response.");
    } catch (err) {
      console.error("AI Suggest error", err);
      setAiFeedback("AI error: " + err.message);
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
      const response = await fetch(`${backend_host}/api/project/${id}/submission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: reportContent }),
      });
      
      const data = await response.json();
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

  return (
    <div className="editor-container" onMouseUp={handleTextSelection}>
      <div className="main-editor">
        <EditorToolbar
          onSummarize={handleAISummarize}
          onProofread={handleAIProofread}
          onSuggest={handleAISuggest}
          aiFeedback={aiFeedback}
        />
        <EditorArea
          ref={editorRef}
          value={reportContent}
          onChange={setReportContent}
          onSelectionChange={handleTextSelection}
        />

        <div className="status-row">
          <div className="save-status">Auto-saving…</div>
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
    </div>
  );
}

export default Submission;