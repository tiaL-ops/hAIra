import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';

function Chat() {
    const { id } = useParams();
    const [message, setMessage] = useState("...");

    useEffect(() => {
        axios.get(`http://localhost:3002/api/project/${id}/chat`)
            .then(response => {
                setMessage(response.data.message);
            });
    }, [id]);

    return (
        <div>
          <h1>Chat for Project {id}</h1>
          <p>Message from server: {message}</p>
        </div>
    );
}

export default Chat;
