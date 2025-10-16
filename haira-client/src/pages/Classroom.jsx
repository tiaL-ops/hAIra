import { useState, useEffect } from "react";
import axios from 'axios';

function Classroom() {
    // State to retrieve the message from backend
    const [message, setMessage] = useState("...");

    // useEffet to run the component after mounts
    useEffect(() => {
        //Let's make a request to the backend
        axios.get("http://localhost:3002/api/classroom")
            .then(response => {
                setMessage(response.data.message);
            });
    }, []); // Empty array, effect runs only once

    //Render
    return (
        <div>
          <h1>Classroom</h1>
          <p>Message from server: {message}</p>
        </div>
    );
}

export default Classroom;
