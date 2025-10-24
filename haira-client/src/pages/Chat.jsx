import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';
import '../styles/Chat.css'; // Your CSS (the updated one you shared)

import AlexAvatar from '../images/Alex.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

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
  const [activeHoursStart, setActiveHoursStart] = useState(9);
  const [activeHoursEnd, setActiveHoursEnd] = useState(17);
  const [projectName, setProjectName] = useState('');
  const [quotaWarning, setQuotaWarning] = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [currentProjectDay, setCurrentProjectDay] = useState(1);
  const [testProjectDay, setTestProjectDay] = useState(1);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(7);
  const [tasks, setTasks] = useState([]);
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);
  const [teammates, setTeammates] = useState({});
  const auth = getAuth();
  
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

  // Agent info - will be populated from Firestore teammates, with fallback to hardcoded
  const agentInfo = Object.keys(teammates).length > 0 
    ? Object.entries(teammates).reduce((acc, [id, teammate]) => {
        if (teammate.type === 'ai') {
          acc[id] = {
            name: teammate.name,
            avatar: teammate.avatar === '📝' ? RasoaAvatar : teammate.avatar === '🧪' ? RakotoAvatar : teammate.avatar,
            role: teammate.role,
            color: teammate.color || '#3498db'
          };
        }
        return acc;
      }, {})
    : {
        alex: { name: 'Alex', avatar: AlexAvatar, role: 'Project Manager', color: '#8e44ad' },
        rasoa: { name: 'Rasoa', avatar: RasoaAvatar, role: 'Planner', color: '#e74c3c' },
        rakoto: { name: 'Rakoto', avatar: RakotoAvatar, role: 'Developer', color: '#3498db' }
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
  // active hours util - AI agents are always active until quota reached
  const isActiveHours = () => {
    // AI agents are always active until user reaches 7 messages per day
    return !quotaExceeded;
  };

  // load saved hours
  useEffect(() => {
    const savedStart = localStorage.getItem('aiActiveHoursStart');
    const savedEnd = localStorage.getItem('aiActiveHoursEnd');
    if (savedStart) setActiveHoursStart(parseInt(savedStart));
    if (savedEnd) setActiveHoursEnd(parseInt(savedEnd));
  }, []);

  const saveActiveHours = (start, end) => {
    localStorage.setItem('aiActiveHoursStart', start);
    localStorage.setItem('aiActiveHoursEnd', end);
    setActiveHoursStart(start);
    setActiveHoursEnd(end);
  };

  // Fetch tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      if (!id || !currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await axios.get(`http://localhost:3002/api/project/${id}/kanban`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.tasks) {
          console.log('Fetched tasks from Firestore:', response.data.tasks);
          setTasks(response.data.tasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Fallback to localStorage if API fails
        const savedTasks = localStorage.getItem(`tasks_${id}`);
        if (savedTasks) {
          console.log('Using localStorage fallback for tasks');
          setTasks(JSON.parse(savedTasks));
        }
      }
    };

    fetchTasks();
  }, [id, currentUser]);

  // Function to refresh tasks from Firestore
  const refreshTasks = async () => {
    if (!id || !currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await axios.get(`http://localhost:3002/api/project/${id}/kanban`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.tasks) {
        console.log('Refreshed tasks from Firestore:', response.data.tasks);
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  // Tasks are now read-only summary display

  // fetch on mount
  useEffect(() => {
    let isMounted = true;
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setStatusMessage('');
        const token = await auth.currentUser.getIdToken(true);
        const [chatResp, projectResp] = await Promise.all([
          axios.get(`http://localhost:3002/api/project/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:3002/api/project/${id}`, { headers: { Authorization: `Bearer ${token}` } })
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
          
          // Refresh tasks after loading messages
          setTimeout(() => {
            refreshTasks();
          }, 500);
          
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
        }
      } catch (err) {
        console.error('[Client] Error fetching data:', err);
        const errorMessage = err.response?.status === 404 ? 'Project not found. Please check the project ID.' : err.message || 'Error loading chat data';
        setStatusMessage(`❌ ${errorMessage}`);
        if (err.response?.status === 404) setTimeout(() => navigate('/'), 3000);
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
      const token = await auth.currentUser.getIdToken(true);
      const response = await axios.post(`http://localhost:3002/api/project/${id}/chat`, {
        content: newMessage,
        activeHours: { start: activeHoursStart, end: activeHoursEnd },
        tasks,
        testProjectDay
      }, { headers: { Authorization: `Bearer ${token}` } });

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

      // Refresh tasks after receiving new messages (AI agents might have created new tasks)
      setTimeout(() => {
        refreshTasks();
      }, 1000);

      setNewMessage("");
      const clearTimeoutMs = response.data.quotaWarning || response.data.quotaExceeded ? 5000 : 3000;
      setTimeout(() => {
        setStatusMessage("");
        if (!response.data.quotaExceeded) setQuotaWarning("");
      }, clearTimeoutMs);
    } catch (err) {
      console.error('[Client] Error sending message:', err);
      
      // Handle quota exceeded error (429)
      if (err.response?.status === 429) {
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
      } else {
        setStatusMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  // NEW: return either message-user or message-in to match your CSS classes
  const getMessageStyle = (senderId) => {
    if (senderId === auth.currentUser?.uid || senderId === 'user') return 'message-user';
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
    if (senderId === auth.currentUser?.uid || senderId === 'user') {
      return { name: 'You', avatar: '👤', role: 'Team Member' };
    }
    if (agentInfo[senderId]) return agentInfo[senderId];
    return { name: senderName || 'Unknown', avatar: '❓', role: 'Member' };
  };

  return (
    <div className="chat-container">
      {/* LEFT SIDEBAR */}
      <div className="chat-sidebar">
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

        {/* Settings Panel */}
        {showSettings && (
          <div className="sidebar-section">
            <div className="settings-panel">
              <h3>⏰ AI Active Hours</h3>
              <div className="time-settings">
                <div className="time-input-group">
                  <label>Start (UTC):</label>
                  <select value={activeHoursStart} onChange={(e) => saveActiveHours(parseInt(e.target.value), activeHoursEnd)}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div className="time-input-group">
                  <label>End (UTC):</label>
                  <select value={activeHoursEnd} onChange={(e) => saveActiveHours(activeHoursStart, parseInt(e.target.value))}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Summary */}
        <div className="sidebar-section">
          <div className="task-section">
            <h3>📋 Today's Tasks</h3>
            <div className="task-summary">
              {tasks.length === 0 ? (
                <p className="no-tasks">No tasks yet</p>
              ) : (
                <div className="task-summary-list">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className={`task-summary-item ${task.completed ? 'completed' : ''}`}>
                      <span className="task-status">{task.completed ? '✅' : '⏳'}</span>
                      <div className="task-content">
                        <div className="task-title">{task.title || task.text || 'Untitled'}</div>
                        {task.description && (
                          <div className="task-description">{task.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <div className="task-more">+{tasks.length - 5} more tasks</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="sidebar-section">
          <div className="test-controls">
            <label>Test Day:</label>
            <select value={testProjectDay} onChange={(e) => setTestProjectDay(parseInt(e.target.value))} className="day-selector">
              {[1,2,3,4,5,6,7].map(d => (<option key={d} value={d}>Day {d}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          <h1>💬 Chat</h1>
          <button 
            className="settings-button" 
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
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