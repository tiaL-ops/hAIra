import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import WeeklyLearningPrompt from '../components/WeeklyLearningPrompt';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/ProjectSelection.css';
import axios from 'axios';

const backend_host = "http://localhost:3002";

export default function ProjectSelection() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [inactiveProjects, setInactiveProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [projectLimits, setProjectLimits] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
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
        const response = await axios.get(`${backend_host}/api/project`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.data.success) {
          throw new Error('Failed to fetch projects');
        }

        const data = response.data;
        setProjects(data.projects || []);
        setActiveProjects(response.data.activeProjects || []);
        setInactiveProjects(response.data.inactiveProjects || []);
        setArchivedProjects(response.data.archivedProjects || []);
        
        // Debug logging for archived projects
        console.log('Archived projects data:', response.data.archivedProjects);
        if (response.data.archivedProjects && response.data.archivedProjects.length > 0) {
          response.data.archivedProjects.forEach(project => {
            console.log(`Archived project: ${project.title}, archivedAt: ${project.archivedAt}, type: ${typeof project.archivedAt}`);
          });
        }
        setProjectLimits({
          ...response.data.projectLimits,
          canCreateNew: response.data.canCreateNew
        });
        
        // Don't auto-show weekly prompt - let user choose when to create projects
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load your projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjects();
  }, [navigate, auth]);


  // Open an existing project
  const handleOpenProject = async (projectId, destination) => {
    try {
      const token = await auth.currentUser.getIdToken();
      
      // Update user's activeProjectId via server
      await axios.post(`${backend_host}/api/project/${projectId}/activate`, {
      }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Navigate to the destination for this project
      navigate(`/project/${projectId}/${destination}`);
    } catch (err) {
      console.error('Error updating active project:', err);
      // Navigate anyway
      navigate(`/project/${projectId}/${destination}`);
    }
  };

  // Show archive confirmation modal
  const handleArchiveProject = (projectId) => {
    setProjectToArchive(projectId);
    setShowArchiveModal(true);
  };

  // Confirm archive action
  const confirmArchiveProject = async () => {
    if (!projectToArchive) return;

    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await axios.post(`${backend_host}/api/project/${projectToArchive}/archive`, {
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Refresh projects
        window.location.reload();
      } else {
        throw new Error('Failed to archive project');
      }
    } catch (err) {
      console.error('Error archiving project:', err);
      setError('Failed to archive project. Please try again.');
    } finally {
      setShowArchiveModal(false);
      setProjectToArchive(null);
    }
  };

  // Cancel archive action
  const cancelArchiveProject = () => {
    setShowArchiveModal(false);
    setProjectToArchive(null);
  };

  // Handle AI project creation
  const handleTopicSelected = (projectId, project) => {
    // Navigate to the new project
    navigate(`/project/${projectId}/kanban`);
  };

  // Handle continue current project
  const handleContinueProject = (currentProject) => {
    navigate(`/project/${currentProject.id}/kanban`);
  };

  // Handle continue inactive project (make it active)
  const handleContinueInactiveProject = async (projectId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      
      // Make the inactive project active
      await axios.post(`${backend_host}/api/project/${projectId}/activate`, {
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh projects to show updated state
      window.location.reload();
    } catch (err) {
      console.error('Error activating project:', err);
      setError('Failed to activate project. Please try again.');
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
        
        {error && (
          <div className="projects-error">
            {error}
          </div>
        )}



        {/* Weekly Learning Prompt - Main Interface */}
        <div className="weekly-prompt-section">
          <WeeklyLearningPrompt
            onTopicSelected={handleTopicSelected}
            onContinueProject={handleContinueProject}
            currentProject={activeProjects[0]}
            canCreateNew={projectLimits?.canCreateNew}
            onClose={() => {}}
          />
        </div>

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="projects-section">
            <h2 className="section-title">Active Projects</h2>
            <div className="projects-grid">
              {activeProjects.map((project) => (
                <div key={project.id} className="project-card">
                  <h3 className="project-card-title">
                    {project.title}
                  </h3>
                  <p className="project-card-status">
                    Status: <span>{project.status}</span>
                  </p>
                  {project.deadline && (
                    <p className="project-deadline">
                      Deadline: {new Date(project.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <div className="project-actions">
                    <button 
                      onClick={() => handleOpenProject(project.id, 'kanban')}
                      className="btn-action btn-kanban"
                    >
                      Kanban Board
                    </button>
                    <button 
                      onClick={() => handleOpenProject(project.id, 'chat')}
                      className="btn-action btn-chat"
                    >
                      Chat
                    </button>
                    <button 
                      onClick={() => handleArchiveProject(project.id)}
                      className="btn-action btn-archive"
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Projects (Can Continue) */}
        {inactiveProjects.length > 0 && (
          <div className="projects-section">
            <h2 className="section-title">Continue Previous Projects</h2>
            <div className="projects-grid">
              {inactiveProjects.map((project) => (
                <div key={project.id} className="project-card inactive-card">
                  <h3 className="project-card-title">
                    {project.title}
                  </h3>
                  <p className="project-card-status">
                    Status: <span className="inactive-status">Inactive</span>
                  </p>
                  {project.deadline && (
                    <p className="project-deadline">
                      Deadline: {new Date(project.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <div className="project-actions">
                    <button 
                      onClick={() => handleContinueInactiveProject(project.id)}
                      className="btn-action btn-continue"
                    >
                      🔄 Continue
                    </button>
                    <button 
                      onClick={() => handleArchiveProject(project.id)}
                      className="btn-action btn-archive"
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archived Projects */}
        {archivedProjects.length > 0 && (
          <div className="projects-section">
            <div className="section-header">
              <h2 className="section-title">Archived Projects</h2>
              <button 
                className="btn-toggle-archived"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? 'Hide' : 'Show'} Archived ({archivedProjects.length})
              </button>
            </div>
            
            {showArchived && (
              <div className="projects-grid archived-projects">
                {archivedProjects.map((project) => (
                  <div key={project.id} className="project-card archived-card">
                    <h3 className="project-card-title">
                      {project.title}
                    </h3>
                    <p className="project-card-status">
                      Status: <span className="archived-status">Archived</span>
                    </p>
                    <p className="archived-date">
                      <strong>{project.title}</strong> - Archived: {project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                    <div className="project-actions">
                      <button 
                        onClick={() => handleOpenProject(project.id, 'kanban')}
                        className="btn-action btn-view"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          title="Archive Project"
          message="Are you sure you want to archive this project? You can restore it later."
          confirmText="Archive"
          cancelText="Cancel"
          type="warning"
          onConfirm={confirmArchiveProject}
          onCancel={cancelArchiveProject}
        />
      </div>
    </div>
  );
}