import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from '../App';
import axios from "axios";
import ContributionTracker from "../components/ContributionTracker";

const backend_host = "http://localhost:3002";

function SubmissionResults() {
  const { id } = useParams(); // project id
  const { currentUser } = useAuth();
  const auth = getAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissionResults = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        const token = await auth.currentUser.getIdToken();
        
        const response = await axios.get(`${backend_host}/api/project/${id}/submission/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setSubmission(response.data.submission);
        setGrade(response.data.grade);
      } catch (err) {
        console.error("Error fetching submission results:", err);
        setError("Failed to load submission results");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionResults();
  }, [id, navigate, auth]);

  if (loading) {
    return (
      <div className="results-container">
        <div className="loading-state">
          <h2>Loading your results...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
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
    <div className="results-container">
      <div className="results-header">
        <h1>📊 Submission Results</h1>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Projects
        </button>
      </div>

      <div className="results-content">
        <div className="grade-section">
          <h2>🎯 AI Grade & Feedback</h2>
          {grade ? (
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
              <div className="grade-feedback">
                <h3>AI Feedback:</h3>
                <p>{grade.feedback || "No feedback available."}</p>
              </div>
            </div>
          ) : (
            <div className="no-grade">
              <p>Grade is being processed...</p>
            </div>
          )}
        </div>

        <div className="submission-section">
          <h2>📝 Your Submission</h2>
          <div className="submission-content">
            {submission ? (
              <div className="submission-text">
                {submission.content}
              </div>
            ) : (
              <p>No submission content available.</p>
            )}
          </div>
        </div>

        {/* Show contribution metrics only in results page */}
        <div className="contribution-section">
          <h2>📊 Team Contribution Analysis</h2>
          <ContributionTracker 
            projectId={id} 
            showContributions={true}
          />
        </div>

        <div className="actions-section">
          <button 
            onClick={() => navigate(`/project/${id}/submission`)}
            className="edit-submission-btn"
          >
            ✏️ Edit Submission
          </button>
          <button 
            onClick={() => navigate('/')}
            className="home-btn"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmissionResults;
