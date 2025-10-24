import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import '../styles/ProjectSelection.css';

export default function ProjectSelection() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();

  // Get user projects from server
  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch('http://localhost:3002/api/project', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load your projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjects();
  }, [navigate, auth]);

  // Create a new project via server
  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!newProjectTitle.trim()) {
      setError('Please enter a project title');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch('http://localhost:3002/api/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newProjectTitle
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      
  // After creating a project, take the user to Classroom to choose teammates
  navigate(`/project/${data.projectId}/classroom`);
      
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Open an existing project
  const handleOpenProject = async (projectId, destination) => {
    try {
      const token = await auth.currentUser.getIdToken();
      
      // Update user's activeProjectId via server
      await fetch(`http://localhost:3002/api/project/${projectId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Navigate to the destination for this project
      navigate(`/project/${projectId}/${destination}`);
    } catch (err) {
      console.error('Error updating active project:', err);
      // Navigate anyway
      navigate(`/project/${projectId}/${destination}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner-large"></div>
          <p className="loading-text">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-wrapper">
      <div className="projects-container">
        <div className="projects-header">
          <h1 className="projects-title">Your Projects</h1>
          <p className="projects-subtitle">
            Select an existing project or create a new one
          </p>
        </div>
        
        {error && (
          <div className="projects-error">
            {error}
          </div>
        )}

        {/* Create New Project Form */}
        <div className="create-project-section">
          <h2 className="create-project-title">Create New Project</h2>
          
          <form onSubmit={handleCreateProject} className="create-form">
            <div className="form-group">
              <label htmlFor="project-title" className="form-label">
                Project Title
              </label>
              <input
                id="project-title"
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="My Amazing Project"
                className="form-input"
                required
                disabled={creating}
              />
            </div>
            
            <button
              type="submit"
              disabled={creating}
              className="btn-create"
            >
              {creating ? (
                <span className="loading-spinner">
                  <span className="spinner"></span>
                  Creating...
                </span>
              ) : (
                'Create Project'
              )}
            </button>
          </form>
        </div>

        {/* Existing Projects */}
        {projects.length > 0 ? (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <h3 className="project-card-title">
                  {project.title}
                </h3>
                <p className="project-card-status">
                  Status: <span>{project.status}</span>
                </p>
                <div className="project-actions">
                  <button 
                    onClick={() => handleOpenProject(project.id, 'classroom')}
                    className="btn-action btn-primary"
                    title="Choose or activate AI teammates"
                  >
                    Choose Teammates
                  </button>
                  <button 
                    onClick={() => handleOpenProject(project.id, 'kanban')}
                    className="btn-action btn-kanban"
                  >
                    Kanban
                  </button>
                  <button 
                    onClick={() => handleOpenProject(project.id, 'chat')}
                    className="btn-action btn-chat"
                  >
                    Chat
                  </button>
                  <button 
                    onClick={() => handleOpenProject(project.id, 'submission')}
                    className="btn-action btn-secondary"
                  >
                    Submission
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-text">
              You don't have any projects yet. Create one to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}