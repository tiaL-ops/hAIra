import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import ContributionTracker from "../components/ContributionTracker";
import SummaryReflection from "../components/SummaryReflection";
import "../styles/editor.css";
import "../styles/global.css";

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
            const summaryResponse = await fetch(`${backend_host}/api/project/${id}/ai/summarize`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ content: data.submission.content }),
            });
            
            const summaryData = await summaryResponse.json();
            setAiSummary(summaryData?.result || summaryData?.summary || "");
          } catch (summaryErr) {
            console.error("Failed to generate summary:", summaryErr);
          }
        }
        
      } catch (err) {
        console.error("Error fetching submission data:", err);
        setError("Failed to load submission results");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionData();
  }, [id, navigate, auth]);

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
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-success-container">
      <div className="success-header">
        <div className="success-icon">✅</div>
        <h1>Report Submitted Successfully!</h1>
        <p>Your project report has been submitted and reviewed by AI.</p>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Projects
        </button>
      </div>

      <div className="success-content">
        {/* Grade and Contribution Side by Side */}
        <div className="results-row">
          {/* Grade Section - Left Column */}
          <div className="grade-section">
            <h2>🎯 AI Grade & Feedback</h2>
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
                {grade.feedback && (
                  <div className="grade-feedback">
                    <h3>AI Feedback:</h3>
                    <p>{grade.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-grade">
                <p>Grade is being processed...</p>
              </div>
            )}
          </div>

          {/* Contribution Tracker - Right Column */}
          <div className="contribution-section">
            <h2>👥 Team Contributions</h2>
            <ContributionTracker projectId={id} showContributions={true} />
          </div>
        </div>

        {/* AI Summary & Reflection */}
        <div className="summary-section">
          <h2>📝 AI Summary & Reflection</h2>
          <SummaryReflection 
            projectId={id} 
            reportContent={submission?.content || ""} 
            aiSummary={aiSummary}
          />
        </div>

        
      </div>
    </div>
  );
}

export default SubmissionSuccess;
