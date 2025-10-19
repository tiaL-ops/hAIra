import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';

const backend_host = "http://localhost:3002";

function Kanban() {
    const { id } = useParams();
    const [title, setTitle] = useState("");
    const [deliverables, setDeliverables] = useState([]);
    const [message, setMessage] = useState("...");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get(`${backend_host}/api/project/${id}/kanban`)
            .then(response => setMessage(response.data.message || "..."))
            .catch(err => console.error("Error fetching project info:", err));
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim())
            return alert("Please provide a project title first");

        setLoading(true);
        try {
            const response = await axios.post(
                `${backend_host}/api/project/${id}/kanban`,
                {
                    title: title,
                    userId: "user_1", // replace with logged-in user ID
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
