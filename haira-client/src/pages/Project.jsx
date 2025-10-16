// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import React from 'react';
import axios from 'axios';

function Project() {
    const [message, setMessage] = React.useState('Loading...');

    useEffect(() => {
    axios.get("http://localhost:3002/api/project")
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setMessage("Could not load message from server.");
      });
  }, []);


  return (
    <div>
      <h1>Hello!</h1>
      <p>This is the project page.</p>
      <h2>Message from Backend: {message}</h2>

    </div>
  );
}

export default Project;