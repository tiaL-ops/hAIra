import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { useAuth } from '../App';
import { serverFirebaseAvailable } from '../../firebase';
import KanbanBoard from "../components/kanbanBoard";
import TaskReviewModal from "../components/TaskReviewModal";
import '../styles/Chat.css';
import '../styles/Kanban.css';

const backend_host = import.meta.env.VITE_BACKEND_HOST;

// Helper function to retry axios requests on network errors
const axiosWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
      
      if (isNetworkError && !isLastRetry) {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

function Kanban() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
  // Project title is read-only; use from projectData
    const [projectData, setProjectData] = useState(null);
    const [deliverables, setDeliverables] = useState([]);
    const [message, setMessage] = useState("Loading project data...");
    const [loading, setLoading] = useState(false);
    const [kanbanBoardKey, setKanbanBoardKey] = useState(0);
    const [teammates, setTeammates] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    // Auth will be handled through useAuth hook and localStorage fallback

    const rerenderKanbanBoard = () => {
      setKanbanBoardKey(prev => prev + 1);
    }

    useEffect(() => {
      const fetchProjectData = async () => {
        // Use the currentUser from useAuth hook
        if (!currentUser) {
          navigate('/login');
          return;
        }

        try {
          // Get token with fallback
          let token;
          if (serverFirebaseAvailable && currentUser && currentUser.getIdToken) {
            token = await currentUser.getIdToken();
          } else {
            token = `mock-token-${currentUser.uid}-${Date.now()}`;
          }
          
          const response = await axiosWithRetry({
              method: 'get',
              url: `${backend_host}/api/project/${id}/kanban`,
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              timeout: 10000
          });

          if (response.data.project) {
              setProjectData(response.data.project);
              setMessage(response.data.message || "Project loaded");
              
              // Set teammates from project data
              if (response.data.project.team && response.data.project.team.length > 0) {
                setTeammates(response.data.project.team);
              }
          } else {
              setMessage("Project data not found");
          }
        } catch (err) {
            console.error("Error fetching project info:", err);
            setMessage("Error loading project data");
        }
      };
      fetchProjectData();
    }, [id, navigate, currentUser]);

  const handleGenerate = async () => {
    const projTitle = projectData?.title || "";
    if (!projTitle.trim()) {
      alert("Project title is missing. Please reload the page.");
      return;
    }

        setLoading(true);
        try {
            // Get token with fallback
            let token;
            if (serverFirebaseAvailable && currentUser && currentUser.getIdToken) {
              token = await currentUser.getIdToken();
            } else {
              token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
            }

            const response = await axiosWithRetry({
                method: 'post',
                url: `${backend_host}/api/project/kanban/generate`,
                data: {
                    title: projTitle,
                },
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            });

            setDeliverables(response.data.deliverables);
            setShowReviewModal(true); // Show modal instead of just displaying deliverables
        } catch (err) {
            console.error("Could not get deliverables:", err);
            alert("Could not get deliverables");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTasks = async (editedTasks) => {
      try {
        // Get token with fallback
        let token;
        if (serverFirebaseAvailable && currentUser && currentUser.getIdToken) {
          token = await currentUser.getIdToken();
        } else {
          token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
        }
        
        // Transform edited tasks to match backend format
        const tasksToSave = editedTasks.map(task => ({
          deliverable: task.deliverable || task.description,
          assignedTo: task.assignedTo,
          priority: task.priority || 1
        }));
        
        const response = await axiosWithRetry({
          method: 'post',
          url: `${backend_host}/api/project/${id}/kanban`,
          data: {
            title: projectData.title,
            deliverables: tasksToSave
          },
          headers: {
              'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });

        if (!response.data.success)
          throw new Error('data could not be stored to database')

        setShowReviewModal(false);
        setDeliverables([]);
        rerenderKanbanBoard();
        alert('Tasks saved successfully!');
      } catch (error) {
        const msg = 'data could not be stored to database';
        alert(msg);
      }
    };

    return (
      <div className="page-content">
          <div className="page-header-with-nav">
           
            <div className="page-navigation-buttons">
              <button 
                onClick={() => navigate(`/project/${id}/chat`)}
                className="nav-btn nav-btn-chat"
                title="Go to Chat"
              >
                💬 Chat
              </button>
              <button 
                onClick={() => navigate(`/project/${id}/submission`)}
                className="nav-btn nav-btn-submission"
                title="Go to Submission"
              >
                📤 Submission
              </button>
            </div>
          </div>
        <div className="min-h-screen p-6 flex gap-6">
          {/* Left side: Kanban Board */}
          <KanbanBoard id={id} key={kanbanBoardKey}/>

          {/* Right side: Project Info */}
            <div className="page-side-block-col w-96 rounded-2xl shadow-xl mt-12 p-6 border flex flex-col gap-4">
            <div className="text-center">
              {/* Removed duplicate title to avoid showing above Generate Tasks */}
              <p className="text-gray-500 text-sm">{message}</p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="generate-btn">
                {loading ? "Generating…" : "Generate Tasks"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Task Review Modal */}
        {showReviewModal && deliverables.length > 0 && (
          <TaskReviewModal
            tasks={deliverables}
            teammates={teammates}
            onSave={handleSaveTasks}
            onCancel={() => {
              setShowReviewModal(false);
              setDeliverables([]);
            }}
          />
        )}
      </div>
    
    );
}

export default Kanban;
