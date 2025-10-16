// haira-client/src/pages/Project.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
function Project() {
  // we gonna make our default 1 project
  const [selectedId, setSelectedId] = useState('1');

  // Get the navigate function from React Router
  const navigate = useNavigate();

  // This function builds the URL and navigates to it
  const handleNavigate = (view) => {
    if (selectedId) {
      // Example: if view is 'chat', path becomes '/project/1/chat'
      const path = `/project/${selectedId}/${view}`;
      navigate(path);
    } else {
      alert("Please select a project ID first!");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Project Navigation Tester 🧪</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3>1. Select a Project ID:</h3>
        {/* These buttons update the 'selectedId' state */}
        <button onClick={() => setSelectedId('1')}>Project 1</button>
        <button onClick={() => setSelectedId('2')}>Project 2</button>
        <button onClick={() => setSelectedId('3')}>Project 3</button>
        <p>Currently selected ID: <strong>{selectedId}</strong></p>
      </div>

      <div>
        <h3>2. Go to a View for Project {selectedId}:</h3>
        {/* These buttons call handleNavigate with the desired view */}
        <button onClick={() => handleNavigate('chat')}>Go to Chat</button>
        <button onClick={() => handleNavigate('board')}>Go to Board</button>
        <button onClick={() => handleNavigate('submission')}>Go to Submission</button>
      </div>
    </div>
  );
}

export default Project;