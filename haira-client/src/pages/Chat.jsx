import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';

function Chat() {
    const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    // Load existing messages
    useEffect(() => {
        axios.get(`http://localhost:3002/api/project/${id}/chat`)
            .then(response => {
                setMessages(response.data.messages || []);
            })
            .catch(err => console.error(err));
    }, [id]);

    // Send a new message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        try {
            const response = await axios.post(`http://localhost:3002/api/project/${id}/chat`, {
                content: newMessage
            });
            
            // Show success status
            setStatusMessage(`✅ ${response.data.message}`);
            
            // Add the new message to the list
            setMessages([...messages, response.data.data]);
            setNewMessage("");
            
            // Clear status after 3 seconds
            setTimeout(() => setStatusMessage(""), 3000);
        } catch (err) {
            setStatusMessage(`❌ Error: ${err.message}`);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
          <h1>Chat for Project {id}</h1>
          
          {/* Status message */}
          {statusMessage && (
            <div style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              backgroundColor: statusMessage.includes('✅') ? '#d4edda' : '#f8d7da',
              border: '1px solid',
              borderRadius: '5px'
            }}>
              {statusMessage}
            </div>
          )}
          
          {/* Message form */}
          <form onSubmit={sendMessage} style={{ marginBottom: '20px' }}>
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              style={{ 
                padding: '10px', 
                width: '300px', 
                marginRight: '10px',
                fontSize: '14px'
              }}
            />
            <button 
              type="submit"
              style={{ 
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Send to Firebase
            </button>
          </form>
          
          {/* Messages list */}
          <div>
            <h3>Messages:</h3>
            {messages.length === 0 ? (
              <p>No messages yet. Send one!</p>
            ) : (
              <ul>
                {messages.map((msg, index) => (
                  <li key={msg.id || index} style={{ marginBottom: '10px' }}>
                    {msg.content} <small>(at {new Date(msg.timestamp).toLocaleTimeString()})</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
    );
}

export default Chat;
