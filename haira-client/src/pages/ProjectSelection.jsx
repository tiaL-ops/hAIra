import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import WeeklyLearningPrompt from '../components/WeeklyLearningPrompt';
import ConfirmationModal from '../components/ConfirmationModal';
import ProjectViewModal from '../components/ProjectViewModal';
import ProjectWelcome from '../components/ProjectWelcome';
import '../styles/ProjectSelection.css';
import axios from 'axios';
// Avatars
import AlexAvatar from '../images/Alex.png';
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';
import YouAvatar from '../images/You.png';

const backend_host = "http://localhost:3002";

export default function ProjectSelection() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [projectLimits, setProjectLimits] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalProjects, setModalProjects] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [newProject, setNewProject] = useState(null);
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
        setArchivedProjects(response.data.archivedProjects || []);
        

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
  const handleOpenProject = async (projectId, destination, project) => {
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

      const data = await response.json();
      
  // After creating a project, take the user to Classroom to choose teammates
  navigate(`/project/${data.projectId}/classroom`);
      
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

  // Resolve avatar for a teammate
  const avatarMap = {
    alex: AlexAvatar,
    brown: BrownAvatar,
    elza: ElzaAvatar,
    kati: KatiAvatar,
    steve: SteveAvatar,
    sam: SamAvatar,
    rasoa: RasoaAvatar,
    rakoto: RakotoAvatar,
  };

  const getTeammateAvatar = (member) => {
    if (!member) return YouAvatar;
    if (member.type === 'human') return YouAvatar;
    const key = (member.id || member.name || '').toString().toLowerCase();
    return avatarMap[key] || SteveAvatar;
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

  // Handle AI project creation - show welcome modal first
  const handleTopicSelected = (projectId, project) => {
    // Store the new project data
    setNewProject({
      id: projectId,
      title: project.title,
      description: project.description
    });
    // Show welcome modal
    setShowWelcome(true);
  };

  // Handle continue from welcome modal to teammate selection
  const handleContinueFromWelcome = () => {
    setShowWelcome(false);
    if (newProject) {
      // Navigate to classroom to choose teammates
      navigate(`/project/${newProject.id}/classroom`);
    }
  };

  // Handle continue current project
  const handleContinueProject = (currentProject) => {
    navigate(`/project/${currentProject.id}/kanban`);
  };



  // Fix projects without isActive field
  const handleFixProjects = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await axios.post(`${backend_host}/api/project/fix-projects`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Fix projects response:', response.data);
      alert(`Fixed ${response.data.fixed} projects! Most recent project is now active.`);
      
      // Refresh the page to show fixed projects
      window.location.reload();
    } catch (err) {
      console.error('Error fixing projects:', err);
      alert('Failed to fix projects. Please try again.');
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
        {/* <div className="projects-header">
        </div> */}
        
        {error && (
          <div className="projects-error">
            {error}
          </div>
        )}

        {/* Main Projects Display - Show prominently first */}
        {projects.length > 0 ? (
          <div className="main-projects-section">
            <div className="projects-header">
              <h1 className="projects-title">Your Projects</h1>
              <p className="projects-subtitle">Continue working on your existing projects or create a new one</p>
            </div>
            
            <div className="projects-grid-large">
              {projects.map((project) => {
                // Check if teammates exist - must have AI teammates (more than just the owner)
                // Owner is always added by default, so we need more than 1 team member
                const hasTeammates = Array.isArray(project?.team) && project.team.length > 1;
                
                console.log('Project:', project.title, 'team:', project?.team, 'hasTeammates:', hasTeammates);
                
                return (
                  <div key={project.id} className="project-card-large">
                    <h2 className="project-card-title-large">
                      {project.title}
                    </h2>
                    <p className="project-card-status-large">
                      Status: <span className="status-badge">{project.status}</span>
                    </p>
                    
                    {/* Display Teammates */}
                    {hasTeammates ? (
                      <div className="teammates-display">
                        <h3 className="teammates-title">👥 Team Members:</h3>
                        <div className="teammates-list">
                          {project.team.map((member, index) => (
                            <div key={index} className="teammate-item">
                              <img className="teammate-avatar" src={getTeammateAvatar(member)} alt={member.name} />
                              <div className="teammate-info">
                                <span className="teammate-name">{member.name}</span>
                                <span className="teammate-role">{member.role}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="warning-banner">
                        ⚠️ Please choose teammates first!
                      </div>
                    )}
                    
                    {/* Show navigation buttons if teammates are chosen, otherwise show choose teammates button */}
                    <div className="project-actions-large">
                      {hasTeammates ? (
                        <>
                          <button 
                            onClick={() => handleOpenProject(project.id, 'kanban', project)}
                            className="btn-action-large btn-kanban"
                            title="Manage tasks and workflow"
                          >
                            📋 Kanban Board
                          </button>
                          <button 
                            onClick={() => handleOpenProject(project.id, 'chat', project)}
                            className="btn-action-large btn-chat"
                            title="Chat with your AI teammates"
                          >
                            💬 Chat
                          </button>
                          <button 
                            onClick={() => handleOpenProject(project.id, 'submission', project)}
                            className="btn-action-large btn-submission"
                            title="Submit your project"
                          >
                            📤 Submission
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleOpenProject(project.id, 'classroom', project)}
                          className="btn-action-large btn-primary-large"
                          title="Choose your AI teammates"
                        >
                          ⚡ Choose Teammates
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state-large">
            <h2 className="empty-state-title">Welcome to hAIra!</h2>
            <p className="empty-state-text-large">
              You don't have any projects yet. Create your first project below to get started with AI-powered learning!
            </p>
          </div>
        )}

        {/* Weekly Learning Prompt - Secondary Interface for new projects */}
        <div className="weekly-prompt-section">
          <div className="new-project-header">
            <h2>Create New Project</h2>
            <p>Start a new learning journey with AI teammates</p>
          </div>
          <WeeklyLearningPrompt
            onTopicSelected={handleTopicSelected}
            onContinueProject={handleContinueProject}
            currentProject={activeProjects[0]}
            canCreateNew={projectLimits?.canCreateNew}
          />
        </div>

        {/* Project View Buttons - For managing different project states */}
        <div className="project-view-buttons">
          <button 
            className="view-btn active-btn"
            onClick={() => showProjectView(activeProjects, 'Active Projects')}
            disabled={activeProjects.length === 0}
          >
            Active Projects ({activeProjects.length})
          </button>
          
          <button 
            className="view-btn archived-btn"
            onClick={() => showProjectView(archivedProjects, 'Archived Projects')}
            disabled={archivedProjects.length === 0}
          >
            Archived Projects ({archivedProjects.length})
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

        {/* Project Welcome Modal */}
        {showWelcome && newProject && (
          <ProjectWelcome
            project={newProject}
            onContinue={handleContinueFromWelcome}
          />
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