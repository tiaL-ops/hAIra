import { React, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '../App';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import '../styles/TopBar.css';

const backend_host = "http://localhost:3002";


export function NotificationDropdown() {
  const [notification, setNotification] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, isAuthenticated } = useAuth();
  const auth = getAuth();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const checkNotifications = async () => {
    const token = await auth.currentUser.getIdToken();
    const response = await axios.get(`${backend_host}/api/notification`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const newNotif = response.data.notifications;
    if (newNotif) {
      let diff = [];
      diff = newNotif.filter(obj1 =>
        !notification.some(obj2 => obj2.id === obj1.id)
      );

      diff.forEach(item => {
        toast('LISTEN UP: ' + item.message);
      });

      setNotification(newNotif);
    } else {
      setNotification([]);
    }
  };

  const handleClearNotifications = async (e) => {
    setNotification([]);
    setIsOpen(false);
    const token = await auth.currentUser.getIdToken();
    await axios.delete(`${backend_host}/api/notification`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      checkNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [notification]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Topbar Button */}
      <button onClick={toggleDropdown} className='header-heart' aria-hidden>
        ♥ {notification.length > 0 && <span className="topbar-badge bouncy">{notification.length}</span>}
      </button>
      <ToastContainer
        position="bottom-right"
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* Notification List */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: '300px',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            Notifications
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {notification.map((notif) => (
              <li key={notif.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                {notif.message}
              </li>
            ))}
          </ul>
          <button onClick={handleClearNotifications}>
            Clear notifications
          </button>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default function TopBar() {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const tabs = [
    { to: '/projects', label: 'Projects' },
    { to: '/classroom', label: 'Classroom' },
    { to: '/profile', label: 'Profile' },
  ];

  const isActive = (path) => {
    if (path === '/projects' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="header-top">
      <div className="inner">
        {/* Brand */}
        <Link to={isAuthenticated ? '/projects' : '/login'} className="logo">
          hAIra
        </Link>

        {/* Tabs */}
        {isAuthenticated && (
          <nav>
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={isActive(t.to) ? 'active' : ''}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="right">
          {isAuthenticated ? (
            <>
              <NotificationDropdown />
              <span style={{ fontSize: 10, opacity: 0.85 }}>
                {currentUser?.displayName || currentUser?.email}
              </span>
              <button onClick={handleLogout} className="btn logout">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}