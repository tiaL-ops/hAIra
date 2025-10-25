// Test script: Initialize teammates via browser console
// Copy and run this in your browser console while logged in to your app

const projectId = '6I0t7Hj4UDPjiX1a45Il'; // Replace with your project ID

async function initTeammates() {
  try {
    // Get auth token from Firebase
    const token = await firebase.auth().currentUser.getIdToken();
    
    const response = await fetch(`http://localhost:3002/api/project/${projectId}/init-teammates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Init result:', data);
    
    if (data.success) {
      console.log(`🎉 Created ${data.count} teammates!`);
      // Reload the chat page to see teammates
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

initTeammates();
