/**
 * Converts markdown text to HTML by replacing markdown syntax with HTML tags.
 * @param {string} markdown - Markdown text to convert to HTML
 * @returns {string} HTML text
 */
export function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    return markdown
        // Convert headers first
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Convert bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Convert italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Convert numbered lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
        // Convert bullet points
        .replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>')
        // Wrap consecutive list items in ul/ol tags
        .replace(/(<li>.*<\/li>)/gs, (match) => {
            const lines = match.split('\n');
            const listItems = lines.filter(line => line.trim().startsWith('<li>'));
            if (listItems.length > 0) {
                const isNumbered = lines.some(line => /^\d+\./.test(line.trim()));
                const tag = isNumbered ? 'ol' : 'ul';
                return `<${tag}>${listItems.join('')}</${tag}>`;
            }
            return match;
        })
        // Convert double line breaks to paragraph breaks
        .replace(/\n\n/g, '</p><p>')
        // Wrap text blocks in paragraphs (but not headers or lists)
        .replace(/^(?!<[h1-6]|<[uo]l|<li)(.*)$/gm, (match, content) => {
            if (content.trim() === '') return '';
            return `<p>${content}</p>`;
        })
        // Clean up empty paragraphs and fix paragraph wrapping around headers
        .replace(/<p><\/p>/g, '')
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
        .replace(/<p><\/p>/g, '');
}

/**
 * Converts markdown text to plain text by removing markdown formatting and converting to plain text.
 * @param {string} markdown - Markdown text to convert to plain text
 * @returns {string} Plain text
 */
export function convertMarkdownToPlainText(markdown) {
    if (!markdown) return '';
    return markdown
      .replace(/^#{1,6}\s+(.*)$/gm, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\d+\.\s+(.*)$/gm, '• $1')
      .replace(/^[-*]\s+(.*)$/gm, '• $1')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
}

/**
 * Parses the raw string response from the AI model into a JSON object.
 * It cleans up common markdown formatting like ```json and handles parsing errors.
 * @param {string} aiResponse - The raw string response from the Gemini API.
 * @returns {object} The parsed JSON object or an error object if parsing fails.
 */
export function parseAIResponseToJson(aiResponse) {
try {
    // Remove markdown code fences (```json, ```) and trim whitespace
    const cleanedJsonString = aiResponse
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
    
    return JSON.parse(cleanedJsonString);
} catch (parseError) {
    console.error("[AI PARSE ERROR] Failed to parse AI response:", aiResponse);
    // Return a default error structure that matches the expected grade format
    return { 
        error: 'Invalid AI response format', 
        raw: aiResponse,
        overall: 0,
        workPercentage: 0,
        responsiveness: 0,
        reportQuality: 0,
        feedback: "Critical Error: Failed to get AI Response"
    };
}
}

/**
 * This is to clean AI output from gemini
 * @param text - The text to clean
 * @returns - The cleaned text
 */

export function cleanAIResponse(text) {
    if (!text) return '';
    return text
    .replace(/```[\s\S]*?```/g, (match) => {
        // If it's a fenced code block, strip the fences but keep inner text
        return match.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '');
    })
    .replace(/^```[a-zA-Z]*\s*/gm, '') // remove starting ```html or ```json
    .replace(/```$/gm, '') // remove ending ```
    .trim();
}