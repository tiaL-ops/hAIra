import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

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
      
      // Navigate to kanban board for this project
      navigate(`/project/${data.projectId}/kanban`);
      
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-cyan-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-slate-400">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Your Projects
          </h1>
          <p className="text-slate-400 mt-2">
            Select an existing project or create a new one
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Create New Project Form */}
        <div className="bg-slate-800/80 rounded-xl shadow-lg border border-slate-700 p-6 mb-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Create New Project</h2>
          
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="project-title" className="block text-sm font-medium text-slate-300 mb-2">
                Project Title
              </label>
              <input
                id="project-title"
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="My Amazing Project"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-slate-200 placeholder-slate-500 transition"
                required
                disabled={creating}
              />
            </div>
            
            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-500 hover:to-purple-500 focus:ring-4 focus:ring-cyan-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {creating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="bg-slate-800/80 rounded-xl shadow-lg border border-slate-700 p-6 hover:border-cyan-500/50 hover:shadow-cyan-900/30 transition-all duration-300 hover:scale-[1.02]"
              >
                <h3 className="text-xl font-semibold text-slate-200 mb-1">
                  {project.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Status: <span className="capitalize">{project.status}</span>
                </p>
                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={() => handleOpenProject(project.id, 'kanban')}
                    className="flex-1 py-2 px-3 bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-medium rounded-md transition"
                  >
                    Kanban Board
                  </button>
                  <button 
                    onClick={() => handleOpenProject(project.id, 'chat')}
                    className="flex-1 py-2 px-3 bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium rounded-md transition"
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">You don't have any projects yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}