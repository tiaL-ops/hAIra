import { useState, useEffect } from 'react';
import axios from 'axios';

function Profile() {

  const [message, setMessage] = useState("...");

  useEffect(() => {
    axios.get("http://localhost:3002/api/profile")
      .then(response => {
        setMessage(response.data.message);
      });
  }, []);

  return (
    <div>
      <h1>Profile Page</h1>
      <p>Message from server: {message}</p>
    </div>
  );
}

export default Profile;