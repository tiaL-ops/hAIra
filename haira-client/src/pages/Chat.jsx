import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';

function Chat() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();

  // Fetch chats on initial load only
  useEffect(() => {
    let isMounted = true;
    
    // Ensure user is logged in
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        
        const token = await auth.currentUser.getIdToken();
      
        const response = await axios.get(`http://localhost:3002/api/project/${id}/chat`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (isMounted) {
          const newChats = response.data.chats || [];
          console.log(`[Client] Received ${newChats.length} chats`);
          
          const sortedChats = newChats.sort((a, b) => b.timestamp - a.timestamp);
          setMessages(sortedChats);
        }
      } catch (err) {
        console.error('[Client] Error fetching chats:', err);
        setStatusMessage(`❌ Error loading messages: ${err.message}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Fetch on mount only
    fetchChats();
    
    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [id]);

    // Send a new message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        try {
            const token = await auth.currentUser.getIdToken();
            
            const response = await axios.post(`http://localhost:3002/api/project/${id}/chat`, {
                content: newMessage,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'User',
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Show success status
            setStatusMessage(`✅ Message sent to Gemini AI`);
            
            // Add the new chat to the beginning of the list (since we sort newest first)
            const newChats = response.data.chats || [];
            setMessages(prev => {
                const updated = [...newChats, ...prev];
                return updated.sort((a, b) => b.timestamp - a.timestamp);
            });
            
            setNewMessage("");
            
            // Clear status after 3 seconds
            setTimeout(() => setStatusMessage(""), 3000);
        } catch (err) {
            setStatusMessage(`❌ Error: ${err.message}`);
        }
    };

    return (
        <div>
          <h1>Chat for Project {id}</h1>
          
          {/* Status message */}
          {statusMessage && (
            <div>
              {statusMessage}
            </div>
          )}
          
          {/* Message form */}
          <form onSubmit={sendMessage}>
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit">
              Send to AI
            </button>
          </form>
          
          {/* Messages list */}
          <div>
            <h3>Messages:</h3>
            {isLoading ? (
              <p>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p>No messages yet. Send one!</p>
            ) : (
              <ul>
                {messages.map((msg, index) => (
                  <li key={msg.id || index}>
                    <div><strong>{msg.senderName || 'Unknown'}:</strong></div>
                    <div>{msg.text || msg.content}</div>
                    <small>
                      {new Date(msg.timestamp).toLocaleString()}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
    );
}

export default Chat;