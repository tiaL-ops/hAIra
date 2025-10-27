import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, serverFirebaseAvailable } from '../../firebase';
import { useAuth } from '../App';
import ContributionTracker from "../components/ContributionTracker";
import ReflectionModal from "../components/ReflectionModal";
import SuccessIcon from "../images/Success.png";
import { getChromeSummary } from "../utils/chromeAPI.js";
import axios from 'axios';
import "../styles/editor.css";
import "../styles/global.css";
import "../styles/SubmissionSuccess.css";

const backend_host = "http://localhost:3002";

// Helper function to retry axios requests on network errors
const axiosWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
      
      if (isNetworkError && !isLastRetry) {
        console.log(`[Retry ${i + 1}/${maxRetries}] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

function SubmissionSuccess() {
  const { id } = useParams(); // project id
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiGrades, setAiGrades] = useState(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [aiGradingTriggered, setAiGradingTriggered] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // Helper function to get token safely
  const getIdTokenSafely = async () => {
    try {
      if (serverFirebaseAvailable) {
        if (auth && auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      } else {
        // Fallback to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        if (currentUser) {
          return `mock-token-${currentUser.uid}-${Date.now()}`;
        }
      }
    } catch (err) {
      console.error('Error getting token:', err);
      // Fallback to localStorage token on error
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      if (currentUser) {
        return `mock-token-${currentUser.uid}-${Date.now()}`;
      }
    }
    return null;
  };

  // Function to trigger AI grading
  const triggerAIGrading = async () => {
    if (!currentUser) {
      setError("User not authenticated");
      return;
    }

    setGradingLoading(true);
    try {
      const token = await getIdTokenSafely();
      const response = await axiosWithRetry({
        method: 'post',
        url: `${backend_host}/api/project/${id}/ai/grade`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000 // 30 seconds for AI grading (can be slow)
      });

      const data = response.data;
      console.log('AI Grading Response:', data);
      
      if (data.success) {
        setAiGrades(data.grades);
        // Replace the existing grade with AI grades and use AI-generated global feedback
        setGrade(prevGrade => ({
          ...prevGrade, // Preserve existing properties
          overall: data.grades.overall,
          workPercentage: data.grades.workPercentage.score,
          responsiveness: data.grades.responsiveness.score,
          reportQuality: data.grades.reportQuality.score,
          feedback: data.grades.globalFeedback?.feedback || prevGrade.feedback // Use AI feedback or fallback to existing
        }));
        setError(null);
      } else {
        setError(data.error || 'AI grading failed');
      }
    } catch (error) {
      console.error('AI Grading Error:', error);
      setError(`AI grading failed: ${error.message}`);
    } finally {
      setGradingLoading(false);
    }
  };

  useEffect(() => {
    // Fetch submission data from backend for the project
    const fetchSubmissionData = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        const token = await getIdTokenSafely();
        
        // Fetch submission data with retry logic
        const response = await axiosWithRetry({
          method: 'get',
          url: `${backend_host}/api/project/${id}/submission/results`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });
        
        const data = response.data;
        setSubmission(data.submission);
        setGrade(data.grade);
        
        // Generate AI summary if we have content
        if (data.submission?.content) {
          try {
            // Call server-side AI fallback function with retry logic
            const serverSideFallback = async () => {
              const token = await getIdTokenSafely();
              const res = await axiosWithRetry({
                method: 'post',
                url: `${backend_host}/api/project/${id}/ai/summarize`,
                data: { content: data.submission.content },
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                timeout: 10000
              });
              return {
                summary: res.data?.result || res.data?.summary || "No summary returned.",
                source: 'gemini'
              };
            };

            // Execute the server-side fallback
            const result = await serverSideFallback();
            setAiSummary(result.summary);
          } catch (summaryError) {
            console.error("Error generating AI summary:", summaryError);
            setAiSummary("Unable to generate AI summary at this time.");
          }
        }
        // Automatically trigger AI grading after submission data is loaded
        if (!aiGradingTriggered) {
          setAiGradingTriggered(true);
          await triggerAIGrading();
        }
        
        // Check if reflection has already been submitted
        if (data.submission?.reflection) {
          setReflectionSubmitted(true);
        }
        
      } catch (err) {
        console.error("Error fetching submission data:", err);
        setError("Failed to load submission results");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionData();
  }, [id, navigate, aiGradingTriggered, currentUser]);

  // Show reflection modal after results are loaded and grading is complete
  useEffect(() => {
    if (grade && aiGrades && !reflectionSubmitted && !gradingLoading) {
      // Show reflection modal after a short delay to let user see results
      const timer = setTimeout(() => {
        setShowReflectionModal(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [grade, aiGrades, reflectionSubmitted, gradingLoading]);

  // Handle reflection submission
  const handleReflectionSubmit = async (reflectionData) => {
    setReflectionLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backend_host}/api/project/${id}/reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reflection: reflectionData,
          submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setReflectionSubmitted(true);
        setShowReflectionModal(false);
        // Show success message
        alert('Reflection submitted successfully!');
      } else {
        throw new Error(result.error || 'Failed to submit reflection');
      }
    } catch (error) {
      console.error('Reflection submission error:', error);
      alert(`Failed to submit reflection: ${error.message}`);
    } finally {
      setReflectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="submission-success-container">
        <div className="loading-state">
          <h2>Loading your submission results...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="submission-success-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/project/${id}/submission`)} className="back-btn">
            ← Back to Submission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-success-container">
      <div className="success-header">
        <div className="success-icon">
          <img src={SuccessIcon} alt="Success" />
        </div>
        <div className="success-header-content">
          <h1>Report Submitted Successfully!</h1>
          <p>Your project report has been submitted and reviewed by AI.</p>
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back to Projects
          </button>
        </div>
      </div>

      <div className="success-content">
        {/* Grade and Contribution Side by Side */}
        <div className="results-row">
          {/* Grade Section - Left Column */}
          <div className="grade-section">
            <div className="grade-section-header">
              <h2>🎯 Final Grade</h2>
              {/* Detailed Analysis Button - Top Right of Grade Section */}
              {aiGrades && (
                <button 
                  className="detailed-analysis-btn-small"
                  onClick={() => setShowDetailedAnalysis(true)}
                  title="View detailed AI analysis"
                >
                   + View Details
                </button>
              )}
            </div>
            {grade && Object.keys(grade).length > 0 ? (
              <div className="grade-card">
                <div className="grade-score">
                  <span className="score-number">{grade.overall || 0}</span>
                  <span className="score-total">/ 100</span>
                </div>
                <div className="grade-breakdown">
                  <div className="breakdown-item">
                    <span>Work Percentage:</span>
                    <span>{grade.workPercentage || 0}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Responsiveness:</span>
                    <span>{grade.responsiveness || 0}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Report Quality:</span>
                    <span>{grade.reportQuality || 0}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-grade">
                <p>{gradingLoading ? 'AI is evaluating your performance...' : 'Grade is being processed...'}</p>
              </div>
            )}
            
          </div>

          {/* Contribution Tracker - Right Column */}
          <div className="contribution-section">
            <ContributionTracker 
              projectId={id} 
              showContributions={true} 
              editorContent={submission?.content || ''} 
            />
          </div>
        </div>

        {/* AI Feedback Panel - Full Width Below Grade and Contributions */}
        {grade && grade.feedback && (
          <div className="ai-feedback-panel">
            <div className="feedback-header">
              <h2>💬  Project Feedback</h2>
            </div>
            <div className="feedback-content">
              <p>{grade.feedback}</p>
            </div>
          </div>
        )}

        {/* Reflection Status Panel */}
        {reflectionSubmitted && (
          <div className="reflection-status-panel">
            <div className="reflection-status-header">
              <h2>🤔 Reflection Completed</h2>
            </div>
            <div className="reflection-status-content">
              <p>✅ You have successfully submitted your project reflection. Thank you for sharing your thoughts on the AI feedback and your learning experience!</p>
            </div>
          </div>
        )}
        
        {/* AI Summary Style Detailed Analysis Modal */}
        {showDetailedAnalysis && (
          <div className="ai-summary-overlay" onClick={() => setShowDetailedAnalysis(false)}>
            <div className="ai-summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ai-summary-header">
                <div className="header-left">
                  <span className="brain-icon">🧠</span>
                  <h2>AI Detailed Analysis</h2>
                </div>
                <button 
                  className="ai-summary-close-btn"
                  onClick={() => setShowDetailedAnalysis(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="ai-summary-content">
                {aiGrades && (
                  <div className="analysis-content">
                    {/* Responsiveness Analysis */}
                    <div className="gaming-analysis-card">
                      <div className="card-header">
                        <h3>📊 Responsiveness Analysis</h3>
                        <div className="score-badge">{aiGrades.responsiveness.score}%</div>
                      </div>
                      <div className="card-content">
                        <p><strong>Reasoning:</strong> {aiGrades.responsiveness.reasoning}</p>
                        {aiGrades.responsiveness.strengths && aiGrades.responsiveness.strengths.length > 0 && (
                          <div className="strengths-section">
                            <h4>💪 Strengths:</h4>
                            <ul>
                              {aiGrades.responsiveness.strengths.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiGrades.responsiveness.areasForImprovement && aiGrades.responsiveness.areasForImprovement.length > 0 && (
                          <div className="improvement-section">
                            <h4>🎯 Areas for Improvement:</h4>
                            <ul>
                              {aiGrades.responsiveness.areasForImprovement.map((area, index) => (
                                <li key={index}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Percentage Analysis */}
                    <div className="gaming-analysis-card">
                      <div className="card-header">
                        <h3>⚡ Work Contribution Analysis</h3>
                        <div className="score-badge">{aiGrades.workPercentage.score}%</div>
                      </div>
                      <div className="card-content">
                        <p><strong>Reasoning:</strong> {aiGrades.workPercentage.reasoning}</p>
                        {aiGrades.workPercentage.strengths && aiGrades.workPercentage.strengths.length > 0 && (
                          <div className="strengths-section">
                            <h4>💪 Strengths:</h4>
                            <ul>
                              {aiGrades.workPercentage.strengths.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiGrades.workPercentage.areasForImprovement && aiGrades.workPercentage.areasForImprovement.length > 0 && (
                          <div className="improvement-section">
                            <h4>🎯 Areas for Improvement:</h4>
                            <ul>
                              {aiGrades.workPercentage.areasForImprovement.map((area, index) => (
                                <li key={index}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Report Quality Analysis */}
                    <div className="gaming-analysis-card">
                      <div className="card-header">
                        <h3>📝 Report Quality Analysis</h3>
                        <div className="score-badge">{aiGrades.reportQuality.score}%</div>
                      </div>
                      <div className="card-content">
                        <p><strong>Reasoning:</strong> {aiGrades.reportQuality.reasoning}</p>
                        {aiGrades.reportQuality.strengths && aiGrades.reportQuality.strengths.length > 0 && (
                          <div className="strengths-section">
                            <h4>💪 Report Strengths:</h4>
                            <ul>
                              {aiGrades.reportQuality.strengths.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiGrades.reportQuality.areasForImprovement && aiGrades.reportQuality.areasForImprovement.length > 0 && (
                          <div className="improvement-section">
                            <h4>🎯 Areas for Improvement:</h4>
                            <ul>
                              {aiGrades.reportQuality.areasForImprovement.map((area, index) => (
                                <li key={index}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="ai-summary-footer">
                <span className="sparkle-icon">✨</span>
                <span>AI-powered analysis generated</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Reflection Modal */}
        <ReflectionModal
          isOpen={showReflectionModal}
          onClose={() => {}} // Prevent closing - reflection is mandatory
          onSubmit={handleReflectionSubmit}
          aiFeedback={grade?.feedback}
          aiGrades={aiGrades}
          projectTitle={submission?.title || 'Your Project'}
          isLoading={reflectionLoading}
        />
        
      </div>
    </div>
  );
}

export default SubmissionSuccess;
