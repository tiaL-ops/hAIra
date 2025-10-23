// TextHighlighter.jsx
import React, { useEffect, useRef } from 'react';

export default function TextHighlighter({ content, highlightedRanges, onHighlightClick }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current || !highlightedRanges.length) return;

    // Clear existing highlights
    const existingHighlights = contentRef.current.querySelectorAll('.text-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });

    // Apply new highlights
    highlightedRanges.forEach(range => {
      highlightTextRange(range);
    });
  }, [content, highlightedRanges]);

  const highlightTextRange = (range) => {
    if (!contentRef.current) return;

    const textContent = contentRef.current.textContent;
    const start = range.start;
    const end = range.end;

    if (start < 0 || end > textContent.length || start >= end) return;

    // Find the text node and create highlight
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let currentPos = 0;
    let node = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent.length;
      const nodeStart = currentPos;
      const nodeEnd = currentPos + nodeLength;

      // Check if this node contains our range
      if (start < nodeEnd && end > nodeStart) {
        const highlightStart = Math.max(0, start - nodeStart);
        const highlightEnd = Math.min(nodeLength, end - nodeStart);

        if (highlightStart < highlightEnd) {
          const beforeText = node.textContent.substring(0, highlightStart);
          const highlightText = node.textContent.substring(highlightStart, highlightEnd);
          const afterText = node.textContent.substring(highlightEnd);

          // Create highlight element
          const highlightElement = document.createElement('span');
          highlightElement.className = 'text-highlight';
          highlightElement.dataset.commentId = range.commentId;
          highlightElement.textContent = highlightText;
          highlightElement.style.backgroundColor = '#ffeb3b';
          highlightElement.style.padding = '1px 2px';
          highlightElement.style.borderRadius = '2px';
          highlightElement.style.cursor = 'pointer';
          highlightElement.title = 'Click to view comment';
          
          // Add click handler
          highlightElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onHighlightClick) {
              onHighlightClick(range.commentId);
            }
          });

          // Replace the text node
          const parent = node.parentNode;
          const textNodeBefore = document.createTextNode(beforeText);
          const textNodeAfter = document.createTextNode(afterText);

          if (beforeText) {
            parent.insertBefore(textNodeBefore, node);
          }
          parent.insertBefore(highlightElement, node);
          if (afterText) {
            parent.insertBefore(textNodeAfter, node);
          }
          parent.removeChild(node);
        }
      }

      currentPos += nodeLength;
      node = walker.nextNode();
    }
  };

  return (
    <div 
      ref={contentRef}
      className="text-highlighter-container"
      style={{ 
        position: 'relative',
        minHeight: '600px',
        padding: '24px',
        fontFamily: 'Times New Roman, serif',
        fontSize: '16px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
      }}
    >
      {content}
    </div>
  );
}
