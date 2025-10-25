import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';
import KanbanBoard from "../components/kanbanBoard";
import '../styles/Chat.css';
import '../styles/Kanban.css';

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
    const [kanbanBoardKey, setKanbanBoardKey] = useState(0);
    const [notif, setNotif] = useState([]);
    const auth = getAuth();

    const rerenderKanbanBoard = () => {
      setKanbanBoardKey(prev => prev + 1);
    }

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
    }, [id, navigate, notif, auth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim())
            return alert("Please provide a project title first");

        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();

            const response = await axios.post(
                `${backend_host}/api/project/kanban/generate`,
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
    };

    const handleSaveTasks = async (e) => {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.post(
          `${backend_host}/api/project/${id}/kanban`,
          {
            title: title,
            deliverables: deliverables
          },
          {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          }
        );

        if (!response.data.success)
          throw new Error('data could not be stored to database')

        rerenderKanbanBoard();
        setDeliverables([]);
        alert('Now go to work');
      } catch (error) {
        const msg = 'data could not be stored to database';
        console.log(msg);
        alert(msg);
      }
    };

    const handlePushNotifs = async (e) => {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.post(
          `${backend_host}/api/notification`,
          { type: 1, message: 'Hello from your product manager', },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log(response.data);
        if (response.data)
          alert('Sent some notifications');
      } catch (error) {
        const msg = 'data could not be stored to database';
        console.log(msg);
        alert(msg);
      }
    };

    const checkNotifications = async () => {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get(`${backend_host}/api/notification`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.notifications)
        setNotif(response.data.notifications);
      else
        setNotif([]);
    };

    return (
      <div className="page-content">
        <h1 className="title-toolbar text-2xl font-bold mb-4">Kanban Board</h1>
        <div className="min-h-screen p-6 flex gap-6">
          {/* Left side: Kanban Board */}
          <KanbanBoard id={id} key={kanbanBoardKey}/>

          {/* Right side: Project Info */}
          <div className="page-side-block-col w-96 rounded-2xl shadow-xl mt-12 p-6 border border-purple-200 flex flex-col gap-4">
            <div className="text-center">
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
            <button onClick={handlePushNotifs}>Push Notif</button>

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
                <button onClick={handleSaveTasks}>Good to go?</button>
              </div>
            )}
          </div>
        </div>
      </div>
    
    );
}

export default Kanban;
