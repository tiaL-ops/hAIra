import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '../App';
import '../styles/TopBar.css';

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
              <div className="header-heart" aria-hidden>
                ♥
              </div>
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
