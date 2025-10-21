// src/components/TextEditor/CommentSidebar.jsx
import React, { useState } from "react";
import CommentBubble from "./CommentBubble";

export default function CommentSidebar({ comments = [], onReply, onAddComment, onResolve, hasSelection = false }) {
  const [openNew, setOpenNew] = useState(false);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState('all'); // all, resolved, unresolved

  const filteredComments = comments.filter(comment => {
    if (filter === 'resolved') return comment.resolved;
    if (filter === 'unresolved') return !comment.resolved;
    return true;
  });

  function handleAddLocalComment() {
    if (text.trim() && onAddComment) {
      onAddComment(text);
      setOpenNew(false);
      setText("");
    }
  }

  function handleCommentResolve(commentId) {
    if (onResolve) {
      onResolve(commentId);
    }
  }

  const resolvedCount = comments.filter(c => c.resolved).length;
  const unresolvedCount = comments.filter(c => !c.resolved).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Comments & Suggestions</h3>
        <div className="comment-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({comments.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unresolved' ? 'active' : ''}`}
            onClick={() => setFilter('unresolved')}
          >
            Unresolved ({unresolvedCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      <div className="comment-list">
        {filteredComments.length === 0 ? (
          <div className="no-comments">
            <p>No {filter === 'all' ? '' : filter} comments yet.</p>
            <small>Select text in the editor to add comments</small>
          </div>
        ) : (
          filteredComments.map((c) => (
            <CommentBubble key={c.id} comment={c} onReply={onReply} onResolve={handleCommentResolve} />
          ))
        )}
      </div>

      <div className="add-comment-section">
        {!openNew ? (
          <button 
            className="add-comment-btn"
            onClick={() => setOpenNew(true)}
            title="Add a general comment or select text first for a targeted comment"
          >
            + Add Comment
          </button>
        ) : (
          <div className="new-comment-form">
            <textarea 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Write a comment or suggestion..."
              className="comment-textarea"
              autoFocus
            />
            <div className="comment-actions">
              <button 
                className="save-comment-btn"
                onClick={handleAddLocalComment}
                disabled={!text.trim()}
              >
                Comment
              </button>
              <button 
                className="cancel-comment-btn"
                onClick={() => setOpenNew(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}