import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import '../styles/ResearchReportModal.css';

const ResearchReportModal = ({ isOpen, onClose }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && !reportData) {
      fetchResearchReport();
    }
  }, [isOpen, reportData]);

  const fetchResearchReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/home/research-report');
      const data = await response.json();
      
      if (data.success) {
        setReportData(data);
      } else {
        setError(data.error || 'Failed to load research report');
      }
    } catch (err) {
      setError('Network error: Unable to fetch research report');
      console.error('Error fetching research report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="research-modal-overlay" onClick={handleBackdropClick}>
      <div className="research-modal-container">
        <div className="research-modal-header">
          <div className="research-modal-title">
            <h2>hAIra Research Report</h2>
          </div>
          <button 
            className="research-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        
        <div className="research-modal-content">
          {loading && (
            <div className="research-loading">
              <div className="research-spinner"></div>
              <p>Loading research report...</p>
            </div>
          )}
          
          {error && (
            <div className="research-error">
              <div className="error-icon">⚠️</div>
              <h3>Unable to load report</h3>
              <p>{error}</p>
              <button 
                className="retry-button"
                onClick={fetchResearchReport}
              >
                Try Again
              </button>
            </div>
          )}
          
          {reportData && !loading && !error && (
            <div className="research-report-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="report-h1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="report-h2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="report-h3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="report-p">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="report-ul">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="report-ol">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="report-li">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="report-blockquote">{children}</blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="report-code-inline">{children}</code>
                    ) : (
                      <code className={`report-code-block ${className}`}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="report-pre">{children}</pre>
                  ),
                  strong: ({ children }) => (
                    <strong className="report-strong">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="report-em">{children}</em>
                  ),
                  table: ({ children }) => (
                    <div className="report-table-wrapper">
                      <table className="report-table">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="report-th">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="report-td">{children}</td>
                  ),
                }}
              >
                {reportData.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        <div className="research-modal-footer">
          <button 
            className="research-download-btn"
            onClick={() => {
              if (reportData) {
                const blob = new Blob([reportData.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'hAIra-Research-Report.md';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            }}
            disabled={!reportData}
          >
            Download Report
          </button>
          <button 
            className="research-close-btn"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchReportModal;
