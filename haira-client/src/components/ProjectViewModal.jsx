import React from 'react';
import '../styles/ProjectViewModal.css';

export default function ProjectViewModal({ 
  isOpen, 
  projects, 
  title, 
  onClose, 
  onOpenProject, 
  onArchiveProject 
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="project-view-modal-backdrop" onClick={handleBackdropClick}>
      <div className="project-view-modal">
        <div className="project-view-modal-header">
          <h3 className="project-view-modal-title">{title}</h3>
          <button 
            className="project-view-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="project-view-modal-body">
          {projects.length === 0 ? (
            <p className="no-projects-message">No {title.toLowerCase()} projects found.</p>
          ) : (
            <div className="project-view-grid">
              {projects.map((project) => (
                <div key={project.id} className="project-view-card">
                  <h4 className="project-view-card-title">
                    {project.title}
                  </h4>
                  
                  {project.description && (
                    <p className="project-view-card-description">
                      {project.description}
                    </p>
                  )}
                  
                  <p className="project-view-card-status">
                    Status: <span className={`status-${project.status}`}>{project.status}</span>
                  </p>
                  
                  {project.deadline && (
                    <p className="project-view-card-deadline">
                      Deadline: {new Date(project.deadline).toLocaleDateString()}
                    </p>
                  )}
                  
                  {project.managerName && (
                    <p className="project-view-card-manager">
                      Manager: {project.managerName}
                    </p>
                  )}
                  
                  {project.team && project.team.length > 0 && (
                    <p className="project-view-card-team">
                      Team: {project.team.map(member => 
                        typeof member === 'object' ? member.name || member.email || member.id : member
                      ).join(', ')}
                    </p>
                  )}
                  
                  {project.archivedAt && (
                    <p className="project-view-card-archived">
                      Archived: {new Date(project.archivedAt).toLocaleDateString()}
                    </p>
                  )}
                  <div className="project-view-actions">
                    <button 
                      onClick={() => onOpenProject(project.id, 'kanban')}
                      className="btn-kanban"
                    >
                      Kanban Board
                    </button>
                    <button 
                      onClick={() => onOpenProject(project.id, 'chat')}
                      className="btn-chat"
                    >
                      Chat
                    </button>
                    {project.status !== 'archived' && onArchiveProject && (
                      <button 
                        onClick={() => onArchiveProject(project.id)}
                        className="btn-archive"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
