import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';

function Submission() {
    const { id } = useParams();  // get parameters from request
    const [message, setMessage] = useState("...");

    useEffect(() => {
        axios.get(`http://localhost:3002/api/project/${id}/submission`)
            .then(response => {
                setMessage(response.data.message);
            });
    }, [id]);

    return (
        <div>
          <h1>Submission for Project {id}</h1>
          <p>Message from server: {message}</p>
        </div>
    );
}

export default Submission;
