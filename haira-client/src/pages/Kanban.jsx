import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';

function Kanban() {
    const { id } = useParams();
    const [message, setMessage] = useState("...");

    useEffect(() => {
        axios.get(`http://localhost:3002/api/project/${id}/kanban`)
            .then(response => {
                setMessage(response.data.message);
            });
    }, [id]);

    return (
        <div>
          <h1>Kanban for Project {id}</h1>
          <p>Message from server: {message}</p>
        </div>
    );
}

export default Kanban;
