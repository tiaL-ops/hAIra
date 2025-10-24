import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import WeeklyLearningPrompt from '../components/WeeklyLearningPrompt';
import ConfirmationModal from '../components/ConfirmationModal';
import ProjectViewModal from '../components/ProjectViewModal';
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
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalProjects, setModalProjects] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
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

  // Show project modal
  const showProjectView = (projects, title) => {
    setModalProjects(projects);
    setModalTitle(title);
    setShowProjectModal(true);
  };

  // Close project modal
  const closeProjectModal = () => {
    setShowProjectModal(false);
    setModalProjects([]);
    setModalTitle('');
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
        {/* Header Section */}
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



        {/* Weekly Learning Prompt - Main Interface */}
        <div className="weekly-prompt-section">
          <WeeklyLearningPrompt
            onTopicSelected={handleTopicSelected}
            onContinueProject={handleContinueProject}
            currentProject={activeProjects[0]}
            canCreateNew={projectLimits?.canCreateNew}
          />
        </div>

        {/* Project View Buttons */}
        <div className="project-view-buttons">
          <button 
            className="view-btn active-btn"
            onClick={() => showProjectView(activeProjects, 'Active Projects')}
            disabled={activeProjects.length === 0}
          >
            📋 Active Projects ({activeProjects.length})
          </button>
          
          <button 
            className="view-btn inactive-btn"
            onClick={() => showProjectView(inactiveProjects, 'Inactive Projects')}
            disabled={inactiveProjects.length === 0}
          >
            ⏸️ Inactive Projects ({inactiveProjects.length})
          </button>
          
          <button 
            className="view-btn archived-btn"
            onClick={() => showProjectView(archivedProjects, 'Archived Projects')}
            disabled={archivedProjects.length === 0}
          >
            📦 Archived Projects ({archivedProjects.length})
          </button>
        </div>

        {/* Project View Modal */}
        <ProjectViewModal
          isOpen={showProjectModal}
          projects={modalProjects}
          title={modalTitle}
          onClose={closeProjectModal}
          onOpenProject={handleOpenProject}
          onArchiveProject={handleArchiveProject}
        />

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