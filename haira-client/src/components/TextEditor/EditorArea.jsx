// src/components/TextEditor/EditorArea.jsx
import React, { forwardRef, useState, useEffect } from "react";
import { highlightTextWithComments, removeHighlights, getPlainText } from "../../utils/textHighlighter";

const EditorArea = forwardRef(({ value, onChange, onSelectionChange, comments = [], showHighlights = true }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(value.length);
  }, [value]);

  // Note: Textarea doesn't support HTML highlighting
  // For now, we'll keep the highlighting logic for future contentEditable implementation

  const handleSelection = (e) => {
    if (!onSelectionChange) return;
    const textarea = e?.target;
    if (!textarea) return;
    
    // Small delay to ensure selection is updated
    setTimeout(() => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start === end) {
        onSelectionChange(null);
        return;
      }
      const selectedText = value.substring(start, end);
      
      if (selectedText.trim()) {
        onSelectionChange({ text: selectedText, start, end });
      } else {
        onSelectionChange(null);
      }
    }, 10);
  };

  return (
    <div className="editor-wrapper">
      <div className="editor-header">
        <div className="editor-stats">
          <span className="word-count">{wordCount} words</span>
          <span className="char-count">{charCount} characters</span>
        </div>
        <div className="editor-mode">
          {isFocused ? '✏️ Edit Mode' : '💡 Suggest Mode'}
        </div>
      </div>
      
      <textarea
        ref={ref}
        className={`editor-textarea ${isFocused ? 'focused' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        placeholder="Write your final report here...

AI teammates and users can comment.
Comments highlight selected text."
        spellCheck
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        dir="ltr"
      />
      
      <div className="editor-footer">
        <div className="editor-tips">
          💡 Tip: Select text to add comments or get AI suggestions
        </div>
      </div>
    </div>
  );
});

export default EditorArea;