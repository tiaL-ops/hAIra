import { React, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { auth, serverFirebaseAvailable } from '../../firebase';
import { signOut } from 'firebase/auth';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import '../styles/TopBar.css';

const backend_host = "http://localhost:3002";



export default function TopBar() {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Auth will be handled through useAuth hook and localStorage fallback

  const tabs = [
    { to: '/projects', label: 'Projects' },
    ...(serverFirebaseAvailable ? [{ to: '/profile', label: 'Profile' }] : [])
  ];

  const isActive = (path) => {
    if (path === '/projects' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      if (serverFirebaseAvailable) {
        try {
          await signOut(auth);
        } catch (error) {
          console.warn('Firebase logout error, falling back to localStorage:', error);
          // Fall through to localStorage logout
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('__localStorage_current_user__');
      // Dispatch custom event to notify AuthProvider
      window.dispatchEvent(new CustomEvent('localStorageAuthChange'));
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="header-top">
      <div className="inner">
        {/* Brand */}
        <Link to={isAuthenticated ? '/' : '/login'} className="logo">
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