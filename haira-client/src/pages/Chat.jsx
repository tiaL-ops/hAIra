import { useState, useEffect } from "react";
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
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const auth = getAuth();

  // Agent info (you can replace avatar string with an image URL later)
const agentInfo = {
    alex: { name: 'Alex', avatar: AlexAvatar, role: 'Project Manager', color: '#8e44ad' },
    rasoa: { name: 'Rasoa', avatar: RasoaAvatar, role: 'Planner', color: '#e74c3c' },
    rakoto: { name: 'Rakoto', avatar: RakotoAvatar, role: 'Developer', color: '#3498db' }
  };
  // active hours util
  const isActiveHours = () => {
    const now = new Date();
    const hour = now.getUTCHours();
    return hour >= activeHoursStart && hour < activeHoursEnd;
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

  // tasks
  useEffect(() => {
    const savedTasks = localStorage.getItem(`tasks_${id}`);
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, [id]);

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { id: Date.now(), text: newTask, completed: false, createdAt: new Date().toISOString() };
    const updated = [...tasks, task];
    setTasks(updated);
    setNewTask('');
    setShowTaskForm(false);
    localStorage.setItem(`tasks_${id}`, JSON.stringify(updated));
  };

  const toggleTask = (taskId) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    localStorage.setItem(`tasks_${id}`, JSON.stringify(updated));
  };

  const deleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    localStorage.setItem(`tasks_${id}`, JSON.stringify(updated));
  };

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
          const sorted = newChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setMessages(sorted);
          setStatusMessage('');
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
      const newChats = response.data.messages || [];
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
        const updated = [...newChats, ...prev];
        return updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      });

      setNewMessage("");
      const clearTimeoutMs = response.data.quotaWarning || response.data.quotaExceeded ? 5000 : 3000;
      setTimeout(() => {
        setStatusMessage("");
        if (!response.data.quotaExceeded) setQuotaWarning("");
      }, clearTimeoutMs);
    } catch (err) {
      console.error('[Client] Error sending message:', err);
      setStatusMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
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

        {/* Task Management */}
        <div className="sidebar-section">
          <div className="task-section">
            <div className="task-header">
              <h3>📋 Tasks</h3>
              <button className="add-task-btn" onClick={() => setShowTaskForm(!showTaskForm)}>
                {showTaskForm ? '✖' : '➕'}
              </button>
            </div>

            {showTaskForm && (
              <div className="task-form">
                <input 
                  type="text" 
                  value={newTask} 
                  onChange={(e) => setNewTask(e.target.value)} 
                  placeholder="Enter new task..." 
                  onKeyPress={(e) => e.key === 'Enter' && addTask()} 
                />
                <button onClick={addTask}>Add</button>
              </div>
            )}

            <div className="task-list">
              {tasks.length === 0 ? (
                <p className="no-tasks">No tasks yet</p>
              ) : (
                <table className="task-table">
                  <thead><tr><th>Task</th><th>✓</th><th></th></tr></thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className={task.completed ? 'completed' : ''}>
                        <td className="task-text">{task.text}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                          />
                        </td>
                        <td>
                          <button className="delete-btn" onClick={() => deleteTask(task.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        {/* Messages Container */}
        <div className="messages-container">
          {isLoading ? (
            <div className="loading"><p>Loading team chat...</p></div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <p>👋 Start the conversation with your AI teammates!</p>
              <p className="hint">Alex, Rasoa, and Rakoto are {isActiveHours() ? 'online and ready to help' : `currently offline (${activeHoursStart}:00 - ${activeHoursEnd}:00 UTC)`}</p>
            </div>
          ) : (
            <div className="messages-list">
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
              placeholder={quotaExceeded ? "Daily message limit reached..." : "Type @ to mention someone (e.g., @Alex, @Rasoa, @Rakoto)"}
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

          {newMessage.includes('@') && (
            <div className="mention-helper">
              <div className="mention-hint">
                💡 <strong>Direct mention detected!</strong>
                {newMessage.toLowerCase().includes('@alex') && ` @Alex will respond directly (only on Days 1, 3, 6)`}
                {newMessage.toLowerCase().includes('@rasoa') && ` @Rasoa will respond directly`}
                {newMessage.toLowerCase().includes('@rakoto') && ` @Rakoto will respond directly`}
              </div>
              <div className="mention-options">
                <button type="button" className="mention-btn" onClick={() => setNewMessage(newMessage.includes('@') ? newMessage : newMessage + ' @Alex')}>@Alex 📋</button>
                <button type="button" className="mention-btn" onClick={() => setNewMessage(newMessage.includes('@') ? newMessage : newMessage + ' @Rasoa')}>@Rasoa 📚</button>
                <button type="button" className="mention-btn" onClick={() => setNewMessage(newMessage.includes('@') ? newMessage : newMessage + ' @Rakoto')}>@Rakoto 🔧</button>
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
              : `🔴 AI teammates are offline (${activeHoursStart}:00 - ${activeHoursEnd}:00 UTC)`
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
