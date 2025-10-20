import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';

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
        <div>
            <h1>Kanban for Project {id}</h1>
            <p>Message from server: {message}</p>
            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Your project title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)} />
                <button
                    type="submit"
                    disabled={loading}>
                    {loading ? "Waiting..." : "Ask for deliverables"}
                </button>
            </form>
            {deliverables.length > 0 && (
                <div>
                    <h3>Your deliverables</h3>
                    <ul>
                        {deliverables.map((item, index) => (
                        <li key={index}>{item.deliverable}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default Kanban;
