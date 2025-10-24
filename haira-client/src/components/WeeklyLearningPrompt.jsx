import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import '../styles/WeeklyLearningPrompt.css';

const backend_host = "http://localhost:3002";

export default function WeeklyLearningPrompt({ 
  onTopicSelected, 
  onContinueProject, 
  currentProject,
  canCreateNew = true
}) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [showTopics, setShowTopics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topics, setTopics] = useState([]);
  const auth = getAuth();

  const backend_host = "http://localhost:3002";

  // Fetch learning topics from server
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(`${backend_host}/api/project/topics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
        // Fallback topics if server fails
        setTopics([
          { id: 'design', name: 'Product Design', icon: '🎨', description: 'Redesign an app feature for accessibility.', deliverable: 'UX case study' },
          { id: 'research', name: 'Research & Innovation', icon: '🔬', description: 'Benchmark AI writing tools for study help.', deliverable: 'Summary report & criteria list' },
          { id: 'development', name: 'Development & Coding', icon: '💻', description: 'Build technical skills and coding projects', deliverable: 'Codebase & technical documentation' },
          { id: 'business', name: 'Business & Strategy', icon: '📈', description: 'Optimize a fictional company\'s workflow.', deliverable: 'Process flowchart & proposal' },
          { id: 'marketing', name: 'Marketing & Sales', icon: '📈', description: 'Plan a 3-day launch campaign for a school app.', deliverable: 'Content calendar & ad mockups' },
          { id: 'data analysis', name: 'Data & Analytics', icon: '📊', description: 'Analyze survey data about student habits.', deliverable: 'Insight dashboard/report' }
        ]);
      }
    };

    fetchTopics();
  }, [auth]);

  const handleTopicSelect = async (topicId) => {
    setSelectedTopic(topicId);
    setShowTopics(false);
    setLoading(true);
    setError('');

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.post(`${backend_host}/api/project/generate-project`, {
        topic: topicId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        onTopicSelected(response.data.projectId, response.data.project);
      } else {
        throw new Error(response.data.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating AI project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueProject = () => {
    if (onContinueProject) {
      onContinueProject(currentProject);
    }
  };

  return (
    <div className="weekly-prompt-container">
      <div className="weekly-prompt-header">
        <h2>🎯 What do you want to learn this week?</h2>
        <p>Choose a topic to start a new AI-generated project, or continue your current work.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {currentProject && (
        <div className="continue-project-option">
          <button 
            className="btn-continue"
            onClick={handleContinueProject}
            disabled={loading}
          >
            📋 Continue "{currentProject.title}"
          </button>
        </div>
      )}

      {canCreateNew && (
        <div className="topic-selection">
          <button 
            className="btn-select-topic"
            onClick={() => setShowTopics(!showTopics)}
            disabled={loading}
          >
            🚀 Start New Project
          </button>

          {showTopics && (
            <div className="topics-grid">
              {topics.map(topic => (
                <div 
                  key={topic.id}
                  className={`topic-card ${selectedTopic === topic.id ? 'selected' : ''}`}
                  onClick={() => handleTopicSelect(topic.id)}
                >
                  <div className="topic-icon">{topic.icon}</div>
                  <h3 className="topic-name">{topic.name}</h3>
                  <p className="topic-description">{topic.description}</p>
                  <div className="topic-deliverable">
                    <strong>Deliverable:</strong> {topic.deliverable}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canCreateNew && (
        <div className="limit-reached">
          <p>⚠️ You've reached the maximum of 3 projects.</p>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Creating your AI project...</p>
        </div>
      )}
    </div>
  );
}