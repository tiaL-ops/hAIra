// Utility functions for highlighting text with comments

export function highlightTextWithComments(content, comments) {
  if (!content || !comments || comments.length === 0) {
    return content;
  }

  // Sort comments by position (earliest first)
  const sortedComments = comments
    .filter(comment => comment.anchor && comment.anchor.trim())
    .sort((a, b) => {
      const aIndex = content.indexOf(a.anchor);
      const bIndex = content.indexOf(b.anchor);
      return aIndex - bIndex;
    });

  let highlightedContent = content;
  let offset = 0;

  sortedComments.forEach((comment, index) => {
    const anchorText = comment.anchor;
    const originalIndex = content.indexOf(anchorText);
    
    if (originalIndex === -1) {
      return; // Text not found
    }

    const adjustedIndex = originalIndex + offset;
    const beforeText = highlightedContent.substring(0, adjustedIndex);
    const afterText = highlightedContent.substring(adjustedIndex + anchorText.length);
    
    const isResolved = comment.resolved;
    const commentCount = comments.filter(c => c.anchor === anchorText).length;
    
    const highlightClass = isResolved ? 'comment-highlight resolved' : 'comment-highlight';
    const highlightSpan = `<span class="${highlightClass}" data-comment-id="${comment.id}" data-comment-count="${commentCount}">${anchorText}</span>`;
    
    highlightedContent = beforeText + highlightSpan + afterText;
    
    // Update offset for next replacement
    offset += highlightSpan.length - anchorText.length;
  });

  return highlightedContent;
}

export function removeHighlights(content) {
  // Remove all highlight spans and return plain text
  return content.replace(/<span class="comment-highlight[^"]*"[^>]*>(.*?)<\/span>/g, '$1');
}

export function getPlainText(content) {
  // Remove HTML tags and return plain text
  return content.replace(/<[^>]*>/g, '');
}
