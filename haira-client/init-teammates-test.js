// Test script: Initialize teammates via browser console
// Copy and run this in your browser console while logged in to your app

const projectId = '6I0t7Hj4UDPjiX1a45Il'; // Replace with your project ID
const backend_host = import.meta.env.VITE_BACKEND_HOST;
async function initTeammates() {
  try {
    // Get auth token from Firebase
    const token = await firebase.auth().currentUser.getIdToken();
    
    const response = await fetch(`${backend_host}/api/project/${projectId}/init-teammates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Reload the chat page to see teammates
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

initTeammates();
