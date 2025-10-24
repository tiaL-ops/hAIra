import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';
import KanbanBoard from "../components/kanbanBoard";
import '../styles/Chat.css';

const backend_host = "http://localhost:3002";

function Kanban() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [projectData, setProjectData] = useState(null);
    const [deliverables, setDeliverables] = useState([]);
    const [message, setMessage] = useState("Loading project data...");
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    useEffect(() => {
        const fetchProjectData = async () => {
            // Ensure user is logged in
            if (!auth.currentUser) {
                navigate('/login');
                return;
            }

            try {
                // Get Firebase token and fetch project data
                const token = await auth.currentUser.getIdToken();
                
                const response = await axios.get(`${backend_host}/api/project/${id}/kanban`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.data.project) {
                    setProjectData(response.data.project);
                    setTitle(response.data.project.title || "");
                    setMessage(response.data.message || "Project loaded");
                } else {
                    setMessage("Project data not found");
                }
            } catch (err) {
                console.error("Error fetching project info:", err);
                setMessage("Error loading project data");
            }
        };

        fetchProjectData();
    }, [id, navigate, auth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim())
            return alert("Please provide a project title first");

        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            
            const response = await axios.post(
                `${backend_host}/api/project/${id}/kanban`,
                {
                    title: title,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setDeliverables(response.data.deliverables);
            setTitle("");
        } catch (err) {
            console.error("Could not get deliverables:", err);
            alert("Could not get deliverables");
        } finally {
            setLoading(false);
        }
    }

    return (
      <div className="chat-container min-h-screen p-6 flex gap-6">
        <h1 className="toolbar text-2xl font-bold mb-4" style={{ color: '#302e2eff' }}>Kanban Board</h1>
        {/* Left side: Kanban Board */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl p-6">
          <KanbanBoard />
        </div>

        {/* Right side: Project Info */}
        <div className="w-96 bg-white rounded-2xl shadow-xl mt-12 p-6 border border-purple-200 flex flex-col gap-4">
          <div className="text-center" style={{ marginTop: '90px' }}>
            <h2 className="text-xl font-bold text-purple-600 mb-2">Project ID: <span className="text-[#B4565A]">{id}</span></h2>
            <p className="text-gray-500 text-sm">{message}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
            <input
              type="text"
              placeholder="Your project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-pink-400 hover:bg-pink-500 text-black font-semibold py-2 rounded-xl shadow-md disabled:opacity-50 transition-colors">
              {loading ? "Waiting..." : "Ask for deliverables"}
            </button>
          </form>

          {deliverables.length > 0 && (
            <div className="mt-6">
              <h3 className="text-purple-600 font-semibold mb-2">Your Deliverables</h3>
              <ul className="space-y-2">
                {deliverables.map((item, index) => (
                  <li
                    key={index}
                    className="bg-pink-50 border border-pink-200 rounded-lg p-2 shadow-sm text-gray-700">
                    {item.deliverable}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    
    );
}

export default Kanban;
