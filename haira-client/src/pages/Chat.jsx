import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';
import './Chat.css'; // We'll create this CSS file

function Chat() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [activeAgents, setActiveAgents] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [activeHoursStart, setActiveHoursStart] = useState(9); // Default 9 AM
    const [activeHoursEnd, setActiveHoursEnd] = useState(17); // Default 5 PM
    const auth = getAuth();

    // AI agent info for UI
    const agentInfo = {
        rasoa: {
            name: 'Rasoa',
            avatar: '👩‍💼',
            role: 'Project Manager',
            color: '#e74c3c' // Red theme
        },
        rakoto: {
            name: 'Rakoto',
            avatar: '👨‍💻',
            role: 'Developer',
            color: '#3498db' // Blue theme
        }
    };

    // Check if it's active hours (9 AM - 5 PM)
    const isActiveHours = () => {
        const now = new Date();
        const hour = now.getUTCHours();
        return hour >= activeHoursStart && hour < activeHoursEnd;
    };

    // Load saved active hours from localStorage on mount
    useEffect(() => {
        const savedStart = localStorage.getItem('aiActiveHoursStart');
        const savedEnd = localStorage.getItem('aiActiveHoursEnd');
        if (savedStart) setActiveHoursStart(parseInt(savedStart));
        if (savedEnd) setActiveHoursEnd(parseInt(savedEnd));
    }, []);

    // Save active hours to localStorage when changed
    const saveActiveHours = (start, end) => {
        localStorage.setItem('aiActiveHoursStart', start);
        localStorage.setItem('aiActiveHoursEnd', end);
        setActiveHoursStart(start);
        setActiveHoursEnd(end);
    };

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
        if (!newMessage.trim() || isSending) return;
        
        setIsSending(true);
        try {
            const token = await auth.currentUser.getIdToken();
            
            const response = await axios.post(`http://localhost:3002/api/project/${id}/chat`, {
                content: newMessage,
                activeHours: {
                    start: activeHoursStart,
                    end: activeHoursEnd
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Show success status
            setStatusMessage(`✅ Message sent to team`);
            
            // Handle the new response format with multiple messages
            const newChats = response.data.messages || [];
            setActiveAgents(response.data.activeAgents || []);
            
            setMessages(prev => {
                const updated = [...newChats, ...prev];
                return updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });
            
            setNewMessage("");
            
            // Clear status after 3 seconds
            setTimeout(() => setStatusMessage(""), 3000);
        } catch (err) {
            console.error('[Client] Error sending message:', err);
            setStatusMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    // Get message styling based on sender
    const getMessageStyle = (senderId) => {
        if (senderId === auth.currentUser?.uid || senderId === 'user') {
            return 'message-user';
        } else if (senderId === 'rasoa') {
            return 'message-rasoa';
        } else if (senderId === 'rakoto') {
            return 'message-rakoto';
        }
        return 'message-default';
    };

    // Get sender display info
    const getSenderInfo = (senderId, senderName) => {
        if (senderId === auth.currentUser?.uid || senderId === 'user') {
            return {
                name: 'You',
                avatar: '👤',
                role: 'Team Member'
            };
        } else if (agentInfo[senderId]) {
            return agentInfo[senderId];
        }
        return {
            name: senderName || 'Unknown',
            avatar: '❓',
            role: 'Member'
        };
    };

    return (
        <div className="chat-container">
            {/* Header with team status */}
            <div className="chat-header">
                <div className="header-top">
                    <h1>Team Chat - Project {id}</h1>
                    <button 
                        className="settings-button"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Configure AI Active Hours"
                    >
                        ⚙️
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="settings-panel">
                        <h3>⏰ AI Active Hours (UTC)</h3>
                        <p className="settings-description">
                            Set when Rasoa and Rakoto should be available to respond
                        </p>
                        <div className="time-settings">
                            <div className="time-input-group">
                                <label htmlFor="start-time">Start Time:</label>
                                <select 
                                    id="start-time"
                                    value={activeHoursStart}
                                    onChange={(e) => saveActiveHours(parseInt(e.target.value), activeHoursEnd)}
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>
                                            {i.toString().padStart(2, '0')}:00 ({i < 12 ? 'AM' : 'PM'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="time-input-group">
                                <label htmlFor="end-time">End Time:</label>
                                <select 
                                    id="end-time"
                                    value={activeHoursEnd}
                                    onChange={(e) => saveActiveHours(activeHoursStart, parseInt(e.target.value))}
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>
                                            {i.toString().padStart(2, '0')}:00 ({i < 12 ? 'AM' : 'PM'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="current-time-info">
                            <p>Current UTC Time: {new Date().toUTCString()}</p>
                            <p>AI Status: {isActiveHours() ? '🟢 Online' : '🔴 Offline'}</p>
                        </div>
                    </div>
                )}

                <div className="team-status">
                    <div className="status-indicator">
                        <span className="user-status online">👤 You</span>
                    </div>
                    <div className="status-indicator">
                        <span className={`agent-status ${isActiveHours() ? 'online' : 'offline'}`}>
                            {agentInfo.rasoa.avatar} {agentInfo.rasoa.name}
                        </span>
                        <span className="role">{agentInfo.rasoa.role}</span>
                        {!isActiveHours() && <span className="offline-badge">💤</span>}
                    </div>
                    <div className="status-indicator">
                        <span className={`agent-status ${isActiveHours() ? 'online' : 'offline'}`}>
                            {agentInfo.rakoto.avatar} {agentInfo.rakoto.name}
                        </span>
                        <span className="role">{agentInfo.rakoto.role}</span>
                        {!isActiveHours() && <span className="offline-badge">💤</span>}
                    </div>
                </div>
            </div>

            {/* Status message */}
            {statusMessage && (
                <div className="status-message">
                    {statusMessage}
                </div>
            )}

            {/* Messages area */}
            <div className="messages-container">
                {isLoading ? (
                    <div className="loading">
                        <p>Loading team chat...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">
                        <p>👋 Start the conversation with your AI teammates!</p>
                        <p className="hint">
                            Rasoa and Rakoto are {isActiveHours() ? 'online and ready to help' : `currently offline (${activeHoursStart}:00 - ${activeHoursEnd}:00 UTC)`}
                        </p>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((msg, index) => {
                            const senderInfo = getSenderInfo(msg.senderId, msg.senderName);
                            return (
                                <div key={msg.id || index} className={`message ${getMessageStyle(msg.senderId)}`}>
                                    <div className="message-header">
                                        <span className="sender-avatar">{senderInfo.avatar}</span>
                                        <span className="sender-name">{senderInfo.name}</span>
                                        <span className="sender-role">{senderInfo.role}</span>
                                        <span className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="message-content">
                                        {msg.text || msg.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Message input */}
            <div className="message-input-container">
                <form onSubmit={sendMessage} className="message-form">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message your AI teammates..."
                        className="message-input"
                        disabled={isSending}
                    />
                    <button 
                        type="submit" 
                        className="send-button"
                        disabled={isSending || !newMessage.trim()}
                    >
                        {isSending ? '⏳' : '📤'}
                    </button>
                </form>
                <div className="input-hint">
                    {isActiveHours() 
                        ? '🟢 Both AI teammates are online and will respond'
                        : `🔴 AI teammates are offline (${activeHoursStart}:00 - ${activeHoursEnd}:00 UTC)`
                    }
                </div>
            </div>
        </div>
    );
}

export default Chat;