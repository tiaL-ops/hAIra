import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '../App';

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
    <header className="w-full bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to={isAuthenticated ? '/projects' : '/login'} className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          hAIra
        </Link>

        {/* Tabs */}
        {isAuthenticated && (
          <nav className="flex items-center space-x-1">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(t.to)
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline text-sm text-slate-400">
                {currentUser?.displayName || currentUser?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-rose-600/90 hover:bg-rose-500 text-white text-sm font-medium rounded-md transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-white text-sm font-medium rounded-md transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
