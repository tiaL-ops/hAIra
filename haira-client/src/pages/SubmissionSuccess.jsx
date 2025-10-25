import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import ContributionTracker from "../components/ContributionTracker";
import SuccessIcon from "../images/Success.png";
import { getChromeSummary } from "../utils/chromeAPI.js";
import "../styles/editor.css";
import "../styles/global.css";
import "../styles/SubmissionSuccess.css";

const backend_host = "http://localhost:3002";

function SubmissionSuccess() {
  const { id } = useParams(); // project id
  const { currentUser } = useAuth();
  const auth = getAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [grade, setGrade] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiGrades, setAiGrades] = useState(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [aiGradingTriggered, setAiGradingTriggered] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Function to trigger AI grading
  const triggerAIGrading = async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }

    setGradingLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backend_host}/api/project/${id}/ai/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        const token = await auth.currentUser.getIdToken();
        
        // Fetch submission data
        const response = await fetch(`${backend_host}/api/project/${id}/submission/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch submission data');
        }
        
        const data = await response.json();
        setSubmission(data.submission);
        setGrade(data.grade);
        
        // Generate AI summary if we have content
        if (data.submission?.content) {
          try {
            // Call server-side AI fallback function
            const serverSideFallback = async () => {
              const token = await getIdTokenSafely();
              const res = await axios.post(`${backend_host}/api/project/${id}/ai/summarize`, 
                { content: data.submission.content },
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

            // Try Chrome AI first, fallback to Server-side AI
            const summaryData = await getChromeSummary(data.submission.content, serverSideFallback);
      
            setAiSummary( summaryData?.summary || "");
          } catch (summaryErr) {
            console.error("Failed to generate summary:", summaryErr);
          }
        }
        
        // Automatically trigger AI grading after submission data is loaded
        if (!aiGradingTriggered) {
          setAiGradingTriggered(true);
          await triggerAIGrading();
        }
        
      } catch (err) {
        console.error("Error fetching submission data:", err);
        setError("Failed to load submission results");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionData();
  }, [id, navigate, auth, aiGradingTriggered]);

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
            <h2>🎯 Final Grade</h2>
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
            
            {/* Detailed Analysis Button */}
            {aiGrades && (
              <div className="detailed-analysis-button-container">
                <button 
                  className="detailed-analysis-btn"
                  onClick={() => setShowDetailedAnalysis(true)}
                >
                  + View Detailed Analysis
                </button>
              </div>
            )}
            
          </div>

          {/* Contribution Tracker - Right Column */}
          <div className="contribution-section">
            <h2>👥 Team Contributions</h2>
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
        
      </div>
    </div>
  );
}

export default SubmissionSuccess;
