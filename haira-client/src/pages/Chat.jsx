import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { useAuth } from '../App';
import { auth, serverFirebaseAvailable } from '../../firebase';
import '../styles/Chat.css'; // Your CSS (the updated one you shared)

const backend_host = import.meta.env.VITE_BACKEND_HOST;
// Helper function to retry axios requests on network errors
const axiosWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
      
      if (isNetworkError && !isLastRetry) {
        console.log(`[Retry ${i + 1}/${maxRetries}] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

import AlexAvatar from '../images/Alex.png';
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';
import YouAvatar from '../images/You.png';

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
  const [projectName, setProjectName] = useState('');
  const [quotaWarning, setQuotaWarning] = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [currentProjectDay, setCurrentProjectDay] = useState(1);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(7);
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);
  const [teammates, setTeammates] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  
  // Ref for auto-scrolling to the bottom
  const messagesContainerRef = useRef(null);
  const messagesListRef = useRef(null);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const element = messagesContainerRef.current;
      element.scrollTop = element.scrollHeight;
      console.log('Scrolling to bottom:', element.scrollTop, element.scrollHeight);
    }
    
    // Fallback: scroll the last message into view
    if (messagesListRef.current && messagesListRef.current.lastElementChild) {
      messagesListRef.current.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Agent avatar mapping
  const avatarMap = {
    alex: AlexAvatar,
    brown: BrownAvatar,
    elza: ElzaAvatar,
    kati: KatiAvatar,
    steve: SteveAvatar,
    sam: SamAvatar,
    rasoa: RasoaAvatar,
    rakoto: RakotoAvatar
  };

  // Agent info - will be populated from Firestore teammates, with fallback to hardcoded
  const agentInfo = Object.keys(teammates).length > 0 
    ? Object.entries(teammates).reduce((acc, [id, teammate]) => {
        if (teammate.type === 'ai') {
          acc[id] = {
            name: teammate.name,
            avatar: avatarMap[id] || teammate.avatar,
            role: teammate.role,
            color: teammate.color || '#3498db'
          };
        }
        return acc;
      }, {})
    : {
        brown: { name: 'Brown', avatar: BrownAvatar, role: 'Strategic Researcher', color: '#8B4513' },
        elza: { name: 'Elza', avatar: ElzaAvatar, role: 'Creative Writer', color: '#9B59B6' },
        kati: { name: 'Kati', avatar: KatiAvatar, role: 'Data Analyst', color: '#E67E22' },
        steve: { name: 'Steve', avatar: SteveAvatar, role: 'Technical Expert', color: '#16A085' },
        sam: { name: 'Sam', avatar: SamAvatar, role: 'Critical Reviewer', color: '#2980B9' },
        rasoa: { name: 'Rasoa', avatar: RasoaAvatar, role: 'Research Planner', color: '#27ae60' },
        rakoto: { name: 'Rakoto', avatar: RakotoAvatar, role: 'Technical Developer', color: '#3498db' }
      };
  
  // Auto-scroll to bottom when messages change or when loading finishes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Use multiple attempts to ensure scrolling works
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 100);
        setTimeout(scrollToBottom, 200);
      });
    }
  }, [messages, isLoading]);

  // Force scroll to bottom when component mounts with messages
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, messages.length]);

  // Scroll to bottom when component first loads
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll
      scrollToBottom();
      // Then multiple delayed attempts
      const timer1 = setTimeout(() => scrollToBottom(), 100);
      const timer2 = setTimeout(() => scrollToBottom(), 300);
      const timer3 = setTimeout(() => scrollToBottom(), 500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, []);

  // Scroll to bottom when messages container ref is available
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      console.log('Messages container ref available, scrolling to bottom');
      scrollToBottom();
    }
  }, [messagesContainerRef.current, messages.length]);
  // Agents are "active" unless quota has been exceeded
  const isActiveHours = () => !quotaExceeded;

  // Tasks are now read-only summary display

  // fetch on mount
  useEffect(() => {
    let isMounted = true;
    
    // Check authentication with fallback
    const checkAuth = () => {
      if (serverFirebaseAvailable) {
        return auth.currentUser;
      } else {
        // Check localStorage for user
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        return storedUser ? JSON.parse(storedUser) : null;
      }
    };
    
    const currentUser = checkAuth();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setStatusMessage('');
        
        // Get token with fallback
        let token;
        if (serverFirebaseAvailable) {
          token = await auth.currentUser.getIdToken(true);
        } else {
          // Generate mock token for localStorage
          token = `mock-token-${currentUser.uid}-${Date.now()}`;
        }
        const [chatResp, projectResp, profileResp] = await Promise.all([
          axiosWithRetry({ 
            method: 'get',
            url: `${backend_host}/api/project/${id}/chat`,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000
          }),
          axiosWithRetry({ 
            method: 'get',
            url: `${backend_host}/api/project/${id}`,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000
          }),
          axiosWithRetry({ 
            method: 'get',
            url: `${backend_host}/api/profile`,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000
          })
        ]);

        if (isMounted) {
          const project = projectResp.data.project;
          setProjectName(project?.title || project?.name || 'Untitled Project');

          const newChats = chatResp.data.chats || [];
          // Sort chronologically - oldest to newest (ascending order) for proper display
          const sorted = newChats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setMessages(sorted);
          
          // Set teammates from backend response
          if (chatResp.data.teammates) {
            console.log('📥 Teammates loaded from backend:', chatResp.data.teammates);
            setTeammates(chatResp.data.teammates);
          }
          
          // (Removed task summary refresh)
          
          // Get quota information
          if (chatResp.data.quotaExceeded) {
            setQuotaExceeded(true);
            setStatusMessage(`🚫 Daily message limit reached (${chatResp.data.messagesUsedToday}/7)`);
          } else if (chatResp.data.quotaWarning) {
            setQuotaWarning(chatResp.data.quotaWarning);
            setStatusMessage(`⚠️ ${chatResp.data.quotaWarning}`);
            // Show pop-up warning at 5/7 messages
            if (chatResp.data.messagesUsedToday >= 5) {
              setShowQuotaWarning(true);
            }
          } else {
            setStatusMessage('');
          }
          
          // Set message quota stats
          setMessagesUsed(chatResp.data.messagesUsedToday || 0);
          setDailyLimit(chatResp.data.dailyLimit || 7);
          
          // Set current day
          if (chatResp.data.currentProjectDay) {
            setCurrentProjectDay(chatResp.data.currentProjectDay);
          }

          // Set user profile (for avatarUrl)
          if (profileResp?.data?.success && profileResp?.data?.user) {
            setUserProfile(profileResp.data.user);
          }
        }
      } catch (err) {
        console.error('[Client] Error fetching data:', err);
        
        if (err.code === 'ERR_NETWORK' || err.code === 'NETWORK_ERROR') {
          setStatusMessage(`🔌 Cannot connect to server. Please ensure the server is running on port 3002.`);
          console.error('Network error details:', {
            message: err.message,
            code: err.code,
            config: err.config
          });
        } else if (err.code === 'ECONNABORTED') {
          setStatusMessage(`⏱️ Request timeout. Server may be slow or unresponsive.`);
        } else if (err.response?.status === 404) {
          setStatusMessage('❌ Project not found. Please check the project ID.');
          setTimeout(() => navigate('/'), 3000);
        } else if (err.response?.status === 401) {
          setStatusMessage('🔐 Authentication failed. Please try refreshing the page.');
        } else {
          const errorMessage = err.message || 'Error loading chat data';
          setStatusMessage(`❌ ${errorMessage}`);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  // sending
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      // Get token with fallback
      let token;
      if (serverFirebaseAvailable) {
        token = await auth.currentUser.getIdToken(true);
      } else {
        // Check localStorage for user
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
      }
        const response = await axiosWithRetry({
        method: 'post',
        url: `${backend_host}/api/project/${id}/chat`,
        data: { content: newMessage },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      setStatusMessage(`✅ Message sent to team`);
      const newChats = response.data.chats || [];
      setActiveAgents(response.data.activeAgents || []);
      if (response.data.quotaWarning) {
        setQuotaWarning(response.data.quotaWarning);
        setStatusMessage(`⚠️ ${response.data.quotaWarning}`);
      } else if (response.data.quotaExceeded) {
        setQuotaExceeded(true);
        setStatusMessage(`🚫 Daily message limit reached. You can continue tomorrow (Day ${response.data.currentProjectDay + 1}).`);
      } else {
        setStatusMessage(`✅ Message sent to team`);
      }
      if (response.data.currentProjectDay) setCurrentProjectDay(response.data.currentProjectDay);

      setMessages(prev => {
        // Use all messages from server (includes AI responses)
        const sorted = newChats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Force scroll to bottom after state update with multiple attempts
        setTimeout(() => scrollToBottom(), 50);
        setTimeout(() => scrollToBottom(), 150);
        setTimeout(() => scrollToBottom(), 300);
        
        return sorted;
      });

      // Update quota information from response
      if (response.data.messagesUsedToday !== undefined) {
        setMessagesUsed(response.data.messagesUsedToday);
      }
      if (response.data.dailyLimit !== undefined) {
        setDailyLimit(response.data.dailyLimit);
      }
      if (response.data.quotaExceeded !== undefined) {
        setQuotaExceeded(response.data.quotaExceeded);
      }

      // (Removed task summary refresh after sending)

      setNewMessage("");
      const clearTimeoutMs = response.data.quotaWarning || response.data.quotaExceeded ? 5000 : 3000;
      setTimeout(() => {
        setStatusMessage("");
        if (!response.data.quotaExceeded) setQuotaWarning("");
      }, clearTimeoutMs);
    } catch (err) {
      console.error('[Client] Error sending message:', err);
      
      // Handle different types of errors
      if (err.code === 'ERR_NETWORK' || err.code === 'NETWORK_ERROR') {
        setStatusMessage(`🔌 Connection failed. Please check if the server is running on port 3002.`);
        console.error('Network error details:', {
          message: err.message,
          code: err.code,
          config: err.config
        });
      } else if (err.code === 'ECONNABORTED') {
        setStatusMessage(`⏱️ Request timeout. Server may be slow or unresponsive.`);
      } else if (err.response?.status === 429) {
        // Handle quota exceeded error (429)
        const errorData = err.response.data;
        setQuotaExceeded(true);
        setStatusMessage(`🚫 ${errorData.message || 'Daily message limit reached (7 messages per 24 hours)'}`);
        
        // Update quota stats if available
        if (errorData.messagesSentToday !== undefined) {
          setMessagesUsed(errorData.messagesSentToday);
        }
        if (errorData.currentProjectDay !== undefined) {
          setCurrentProjectDay(errorData.currentProjectDay);
        }
      } else if (err.response?.status === 401) {
        setStatusMessage(`🔐 Authentication failed. Please try refreshing the page.`);
      } else {
        setStatusMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  // NEW: return either message-user or message-in to match your CSS classes
  const getMessageStyle = (senderId) => {
    // Check current user with fallback
    let currentUserId;
    if (serverFirebaseAvailable) {
      currentUserId = auth.currentUser?.uid;
    } else {
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      currentUserId = storedUser ? JSON.parse(storedUser).uid : null;
    }
    
    if (senderId === currentUserId || senderId === 'user') return 'message-user';
    return 'message-in';
  };

  // new avatar renderer for list and messages (image or emoji fallback)
// new avatar renderer for list and messages (image or emoji fallback)
  const Avatar = ({ avatar, alt, size = 48 }) => {
    // Check if the avatar is one of the known emoji fallbacks
    const isEmojiFallback = avatar === '👤' || avatar === '❓';

    if (isEmojiFallback) {
      // It's an emoji, render as text in a span
      return <span className="avatar" style={{ fontSize: size * 0.6 }}>{avatar}</span>;
    }

    // Otherwise, assume it's an image path (like AlexAvatar or a https:// URL)
    // and render it as an <img> tag.
    return <img src={avatar} alt={alt} className="avatar pixel-art" style={{ width: size, height: size }} />;
  };
  // sender info helper
  const getSenderInfo = (senderId, senderName) => {
    // Check current user with fallback
    let currentUserId;
    if (serverFirebaseAvailable) {
      currentUserId = auth.currentUser?.uid;
    } else {
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      currentUserId = storedUser ? JSON.parse(storedUser).uid : null;
    }
    
    // Current user (human): prefer profile avatarUrl, then teammates avatar, then fallback
    if (senderId === currentUserId || senderId === 'user') {
      const human = teammates[currentUserId]
        || Object.values(teammates || {}).find(t => t.type === 'human');
      const avatar = userProfile?.avatarUrl || human?.avatar || YouAvatar;
      return {
        name: human?.name || userProfile?.name || 'You',
        avatar,
        role: human?.role || 'Team Member'
      };
    }
    // Known AI agent info
    if (agentInfo[senderId]) return agentInfo[senderId];
    // Fallback: try teammates map for avatar/name
    const teammate = teammates[senderId];
    if (teammate) {
      return { name: teammate.name || senderName || 'Member', avatar: teammate.avatar || AlexAvatar, role: teammate.role || 'Member' };
    }
    return { name: senderName || 'Unknown', avatar: '❓', role: 'Member' };
  };

  return (
    <div className="chat-container">
      {/* LEFT SIDEBAR */}
      <div className="chat-sidebar">
          {/* Navigation Bar */}
            <div className="sidebar-section page-navigation-buttons">
              <div className="nav-bar">
                <button 
                  onClick={() => navigate(`/project/${id}/kanban`)}
                  className="nav-tab nav-tab-kanban"
                  title="Go to Kanban Board"
                >
                  📋 Kanban
                </button>
                <button 
                  onClick={() => navigate(`/project/${id}/submission`)}
                  className="nav-tab nav-tab-submission"
                  title="Go to Submission"
                >
                  📤 Submission
                </button>
              </div>
            </div>

            {/* User profile card showing the same avatar as profile */}
            <div className="sidebar-section">
              <div className="user-profile-card">
                <div className="profile-avatar-container">
                  <Avatar avatar={userProfile?.avatarUrl || YouAvatar} alt={userProfile?.name || 'You'} size={48} />
                </div>
                <div className="profile-info">
                  <div className="profile-name">{userProfile?.name || 'You'}</div>
                  {userProfile?.email && (
                    <div className="profile-stats"><span className="stat-item">{userProfile.email}</span></div>
                  )}
                </div>
              </div>
            </div>
        
        {/* Project Info */}
        <div className="sidebar-section">
          <h3>📋 {projectName || 'Project Chat'}</h3>
          <div className="project-day">Day {currentProjectDay}</div>
          
          {/* Message Quota Display */}
          <div className="message-quota">
            <div className="quota-label">Messages (24h): 
              <span className={quotaExceeded ? 'quota-exceeded' : messagesUsed >= 7 ? 'quota-warning' : ''}>
                {messagesUsed}/{dailyLimit}
              </span>
            </div>
            <div className="quota-progress">
              <div 
                className={`quota-bar ${quotaExceeded ? 'quota-exceeded' : messagesUsed >= 7 ? 'quota-warning' : ''}`}
                style={{ width: `${(messagesUsed / dailyLimit) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Team Status */}
        <div className="sidebar-section">
          <h3>👥 Team Status</h3>
          <div className="team-status">
            {Object.entries(agentInfo).map(([key, agent]) => {
              const isOnline = activeAgents.includes(key) && isActiveHours();
              return (
                <div key={key} className={`status-indicator ${isOnline ? 'ready' : ''}`}>
                  <Avatar avatar={agent.avatar} alt={agent.name} size={48} />
                  <div>
                    <div className="name">{agent.name}</div>
                    <div className="meta">
                      <span>{agent.role}</span>
                      {isOnline && <span className="ready-badge">Ready!</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* (Removed Settings Panel, Today's Tasks, and Test Controls) */}
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          <h1>💬 Chat</h1>
        </div>

        {/* Status Messages */}
        <div className="status-container">
          {statusMessage && <div className="status-message">{statusMessage}</div>}
          {quotaWarning && <div className="quota-warning">{quotaWarning}</div>}
          {quotaExceeded && <div className="quota-exceeded">Daily message limit reached</div>}
        </div>

        {/* Quota Warning Pop-up */}
        {showQuotaWarning && (
          <div className="quota-warning-popup">
            <div className="popup-content">
              <div className="popup-header">
                <span className="popup-icon">⚠️</span>
                <h3>Message Limit Warning</h3>
              </div>
              <div className="popup-body">
                <p>You've used {messagesUsed}/7 messages in the last 24 hours.</p>
                <p>Only {7 - messagesUsed} messages remaining!</p>
              </div>
              <div className="popup-footer">
                <button 
                  className="popup-close-btn"
                  onClick={() => setShowQuotaWarning(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Messages Container */}
        <div className="messages-container" ref={messagesContainerRef}>
          {isLoading ? (
            <div className="loading"><p>Loading team chat...</p></div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <p>👋 Start the conversation with your AI teammates!</p>
              <p className="hint">
                {Object.keys(teammates).filter(id => teammates[id].type === 'ai').map(id => teammates[id].name).join(', ') || 'AI teammates'} are {isActiveHours() ? 'online and ready to help' : 'offline (daily message limit reached)'}
              </p>
            </div>
          ) : (
            <div className="messages-list" ref={messagesListRef}>
              {messages.map((msg, index) => {
                const sender = getSenderInfo(msg.senderId, msg.senderName);
                return (
                  <div key={msg.id || index} className={`message ${getMessageStyle(msg.senderId)}`}>
                    <div className="message-header">
                      <Avatar avatar={sender.avatar} alt={sender.name} size={32} />
                      <span className="sender-name">{sender.name}</span>
                      <span className="sender-role">{sender.role}</span>
                      <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="message-content">
                      {(msg.text || msg.content || '').split(/(@\w+)/g).map((part, i) => {
                        if (part.match(/^@\w+$/)) return <span key={i} className="mention-highlight">{part}</span>;
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="message-input-container">
          <form onSubmit={sendMessage} className="message-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={quotaExceeded ? "Daily message limit reached..." : `Type @ to mention someone (e.g., ${Object.keys(teammates).filter(id => teammates[id].type === 'ai').map(id => '@' + teammates[id].name).join(', ') || '@teammate'})`}
              className="message-input"
              disabled={isSending || quotaExceeded}
            />
            <button
              type="submit"
              className="send-button"
              disabled={isSending || !newMessage.trim() || quotaExceeded}
            >
              {isSending ? '⏳' : quotaExceeded ? '🚫' : '📤'}
            </button>
          </form>

          {newMessage.includes('@') && Object.keys(teammates).length > 0 && (
            <div className="mention-helper">
              <div className="mention-hint">
                💡 <strong>Direct mention detected!</strong>
                {Object.entries(teammates)
                  .filter(([id, t]) => t.type === 'ai')
                  .map(([id, t]) => {
                    if (newMessage.toLowerCase().includes('@' + t.name.toLowerCase())) {
                      return ` @${t.name} will respond directly${t.activeDays ? ` (only on ${t.activeDays.map(d => `Day ${d}`).join(', ')})` : ''}`;
                    }
                    return null;
                  })
                  .filter(Boolean)
                  .join('')
                }
              </div>
              <div className="mention-options">
                {Object.entries(teammates)
                  .filter(([id, t]) => t.type === 'ai')
                  .map(([id, t]) => (
                    <button 
                      key={id}
                      type="button" 
                      className="mention-btn" 
                      onClick={() => setNewMessage(newMessage.includes('@') ? newMessage : newMessage + ' @' + t.name)}
                    >
                      @{t.name} {t.emoji || t.avatar}
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          <div className="input-hint">
            {quotaExceeded
              ? `🚫 Daily message limit reached. Continue tomorrow (Day ${currentProjectDay + 1})`
              : quotaWarning
              ? `⚠️ ${quotaWarning}`
              : isActiveHours()
              ? '🟢 AI teammates are online and will respond'
              : '🔴 AI teammates are offline (daily message limit reached)'
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;