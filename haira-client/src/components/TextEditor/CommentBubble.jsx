// src/components/TextEditor/CommentBubble.jsx
import React, { useState } from "react";

export default function CommentBubble({ comment, onReply, onResolve, onHighlightClick }) {
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(true);
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText);
      setReplyText("");
      setIsReplying(false);
    }
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(comment.id);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`comment-bubble ${comment.resolved ? 'resolved' : ''}`}>
      <div className="comment-header">
        <div className="comment-author">
          <div className="author-avatar">
            {comment.author === 'AI Alex' ? '🤖' : comment.author === 'You' ? '👤' : '👥'}
          </div>
          <div className="author-info">
            <strong>{comment.author}</strong>
            <span className="comment-time">{formatTime(comment.createdAt)}</span>
          </div>
        </div>
        <div className="comment-actions">
          {!comment.resolved && (
            <button 
              className="resolve-btn"
              onClick={handleResolve}
              title="Mark as resolved"
            >
              ✓
            </button>
          )}
        </div>
      </div>

      {comment.anchor && (
        <div className="comment-anchor">
          <em>"{comment.anchor}"</em>
          {!comment.resolved ? (
            <button 
              className="highlight-text-btn"
              onClick={() => onHighlightClick && onHighlightClick(comment.id)}
              title="Click to highlight this text in the editor"
            >
              📍 Highlight in text
            </button>
          ) : (
            <span className="highlight-removed-indicator">
              ✅ Highlight removed (comment resolved)
            </span>
          )}
        </div>
      )}

      <div className="comment-content">
        {comment.text}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="replies-section">
          <button 
            className="toggle-replies-btn"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? '▼' : '▶'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          
          {showReplies && (
            <div className="replies-list">
              {comment.replies.map((r, i) => (
                <div key={i} className="reply-item">
                  <div className="reply-author">
                    <strong>{r.author}</strong>
                    <span className="reply-time">{formatTime(r.at)}</span>
                  </div>
                  <div className="reply-content">{r.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!comment.resolved && (
        <div className="comment-footer">
          {!isReplying ? (
            <button 
              className="reply-btn"
              onClick={() => setIsReplying(true)}
            >
              Reply
            </button>
          ) : (
            <div className="reply-form">
              <textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="reply-textarea"
                autoFocus
              />
              <div className="reply-actions">
                <button 
                  className="send-reply-btn"
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                >
                  Reply
                </button>
                <button 
                  className="cancel-reply-btn"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}