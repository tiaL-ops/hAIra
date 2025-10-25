import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import '../styles/WeeklyLearningPrompt.css';

// Prefer environment override, fallback to localhost for dev
const backend_host = import.meta?.env?.VITE_BACKEND_HOST || "http://localhost:3002";

export default function WeeklyLearningPrompt({ 
  onTopicSelected, 
  onContinueProject, 
  currentProject,
  canCreateNew = true
}) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topics, setTopics] = useState([]);
  const [showChoice, setShowChoice] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const auth = getAuth();

  // Fetch learning topics from server
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        console.log('[WeeklyLearningPrompt] Fetching topics...');
        const token = await auth.currentUser?.getIdToken?.();
        console.log('[WeeklyLearningPrompt] Token obtained:', token ? 'Yes' : 'No');
        
        const response = await axios.get(`${backend_host}/api/project/topics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('[WeeklyLearningPrompt] Response received:', response.status);
        if (response.data.success) {
          console.log('[WeeklyLearningPrompt] Topics loaded:', response.data.topics?.length || 0);
          setTopics(response.data.topics || []);
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

  // Handle topic selection - show choice between generate new vs pick existing
  const handleTopicSelect = (topicId) => {
    setSelectedTopic(topicId);
    setShowChoice(true);
    setError('');
  };

  // Fetch available templates for the selected topic
  const fetchAvailableTemplates = async () => {
    if (!selectedTopic) return;
    
    setLoadingTemplates(true);
    try {
      const token = await auth.currentUser?.getIdToken?.();
      const response = await axios.get(`${backend_host}/api/project/templates/${selectedTopic}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setAvailableTemplates(response.data.templates || []);
      } else {
        setAvailableTemplates([]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setAvailableTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Handle choice: Generate new project
  const handleGenerateNew = async () => {
    if (!selectedTopic) return;
    
    setLoading(true);
    setError('');

    try {
      const token = await auth.currentUser?.getIdToken?.();
      const response = await axios.post(`${backend_host}/api/project/generate-project`, {
        topic: selectedTopic,
        action: 'generate_new'
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

  // Handle choice: Pick from existing templates
  const handlePickExisting = () => {
    fetchAvailableTemplates();
  };

  // Handle template selection and project creation
  const handleTemplateSelect = async (templateId) => {
    if (!selectedTopic || !templateId) return;
    
    setLoading(true);
    setError('');

    try {
      const token = await auth.currentUser?.getIdToken?.();
      const response = await axios.post(`${backend_host}/api/project/generate-project`, {
        topic: selectedTopic,
        action: 'use_template',
        templateId: templateId
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
      console.error('Error creating project from template:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset choice and go back to topic selection
  const handleBackToTopics = () => {
    setShowChoice(false);
    setSelectedTopic('');
    setAvailableTemplates([]);
    setSelectedTemplate('');
    setError('');
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

      {canCreateNew && !showChoice && (
        <div className="topic-selection">
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
        </div>
      )}

      {canCreateNew && showChoice && (
        <div className="project-choice">
          <div className="choice-header">
            <h3>🎯 {topics.find(t => t.id === selectedTopic)?.name} Project</h3>
            <p>How would you like to create your project?</p>
            <button className="btn-back" onClick={handleBackToTopics}>
              ← Back to topics
            </button>
          </div>

          <div className="choice-options">
            <div className="choice-card" onClick={handleGenerateNew}>
              <div className="choice-icon">🤖</div>
              <h4>Generate New Project</h4>
              <p>Create a unique AI-generated project tailored to your needs</p>
              <button className="btn-choice" disabled={loading}>
                {loading ? 'Generating...' : '🚀 Generate New'}
              </button>
            </div>

            <div className="choice-card" onClick={handlePickExisting}>
              <div className="choice-icon">📋</div>
              <h4>Pick from Existing</h4>
              <p>Choose from previously created project templates</p>
              <button className="btn-choice" disabled={loadingTemplates}>
                {loadingTemplates ? 'Loading...' : '📚 Browse Templates'}
              </button>
            </div>
          </div>

          {availableTemplates.length > 0 && (
            <div className="templates-section">
              <h4>Available Templates:</h4>
              <div className="templates-grid">
                {availableTemplates.map(template => (
                  <div 
                    key={template.id}
                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h5>{template.title}</h5>
                    <p>{template.description}</p>
                    <div className="template-meta">
                      <span>Used {template.usageCount || 0} times</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedTemplate && (
                <button 
                  className="btn-generate-project"
                  onClick={() => handleTemplateSelect(selectedTemplate)}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '🚀 Use This Template'}
                </button>
              )}
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