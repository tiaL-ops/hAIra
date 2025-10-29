import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, db, serverFirebaseAvailable } from '../firebase';
import Home from './pages/Home';
import TopBar from './components/TopBar';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Classroom from './pages/Classroom';

import Chat from './pages/Chat';
import Submission from './pages/Submission';
import SubmissionSuccess from './pages/SubmissionSuccess';
import Kanban from './pages/Kanban';
import ProjectSelection from './pages/ProjectSelection';
import './App.css';

// Create authentication context
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Authentication provider component
function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState('firebase');

  useEffect(() => {
    const initializeAuth = () => {
      // Check if server has Firebase available
      if (serverFirebaseAvailable) {
        // Use Firebase auth
        setStorageMode('firebase');
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
          setCurrentUser(user);
          setLoading(false);
        });
        return unsubscribe;
      } else {
        // Use localStorage fallback
        setStorageMode('localStorage');
        
        // Check localStorage for existing user
        const checkLocalStorageUser = () => {
          try {
            const storedUser = localStorage.getItem('__localStorage_current_user__');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              // Create a mock user object that matches Firebase user structure
              const mockUser = {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
                emailVerified: true,
                isAnonymous: false,
                getIdToken: async () => `mock-token-${userData.uid}-${Date.now()}`,
                getIdTokenResult: async () => ({
                  token: `mock-token-${userData.uid}-${Date.now()}`,
                  authTime: Date.now(),
                  issuedAtTime: Date.now(),
                  expirationTime: Date.now() + (60 * 60 * 1000),
                  signInProvider: 'local',
                  signInSecondFactor: null,
                  claims: {
                    aud: 'local',
                    auth_time: Math.floor(Date.now() / 1000),
                    exp: Math.floor((Date.now() + (60 * 60 * 1000)) / 1000),
                    iat: Math.floor(Date.now() / 1000),
                    iss: 'local',
                    sub: userData.uid
                  }
                })
              };
              return mockUser;
            }
            
            // AUTO-LOGIN: If no user exists in localStorage, create default test user
            const defaultUser = {
              uid: 'test-user',
              email: 'hello@test.com',
              displayName: 'Test User',
              photoURL: null
            };
            localStorage.setItem('__localStorage_current_user__', JSON.stringify(defaultUser));
            
            const mockUser = {
              uid: defaultUser.uid,
              email: defaultUser.email,
              displayName: defaultUser.displayName,
              photoURL: defaultUser.photoURL,
              emailVerified: true,
              isAnonymous: false,
              getIdToken: async () => `mock-token-${defaultUser.uid}-${Date.now()}`,
              getIdTokenResult: async () => ({
                token: `mock-token-${defaultUser.uid}-${Date.now()}`,
                authTime: Date.now(),
                issuedAtTime: Date.now(),
                expirationTime: Date.now() + (60 * 60 * 1000),
                signInProvider: 'local',
                signInSecondFactor: null,
                claims: {
                  aud: 'local',
                  auth_time: Math.floor(Date.now() / 1000),
                  exp: Math.floor((Date.now() + (60 * 60 * 1000)) / 1000),
                  iat: Math.floor(Date.now() / 1000),
                  iss: 'local',
                  sub: defaultUser.uid
                }
              })
            };
            return mockUser;
          } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
          }
        };
        
        // Set up localStorage listener
        const handleStorageChange = (e) => {
          if (e.key === '__localStorage_current_user__') {
            const user = checkLocalStorageUser();
            setCurrentUser(user);
          }
        };
        
        // Set up custom event listener for same-tab changes
        const handleAuthChange = () => {
          const user = checkLocalStorageUser();
          setCurrentUser(user);
        };
        
        // Initial check
        const user = checkLocalStorageUser();
        setCurrentUser(user);
        setLoading(false);
        
        // Listen for changes
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('localStorageAuthChange', handleAuthChange);
        
        // Return cleanup function
        return () => {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('localStorageAuthChange', handleAuthChange);
        };
      }
    };

    const unsubscribe = initializeAuth();
    return unsubscribe; // Unsubscribe on cleanup
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    storageMode
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, storageMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If using localStorage (no Firebase), auto-login is enabled - allow access
    if (storageMode === 'localStorage') {
      return; // Skip authentication check
    }
    
    // If using Firebase, require authentication
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, storageMode, navigate]);

  // Allow access if localStorage mode OR authenticated
  return (storageMode === 'localStorage' || isAuthenticated) ? children : null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TopBar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/projects" element={
            <ProtectedRoute>
              <ProjectSelection />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
        
          <Route path="/project/:id/classroom" element={
            <ProtectedRoute>
              <Classroom />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <ProjectSelection />
            </ProtectedRoute>
          } />
          
         
          
          <Route path="/project/:id/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          
          <Route path="/project/:id/submission" element={
            <ProtectedRoute>
              <Submission />
            </ProtectedRoute>
          } />
          
          <Route path="/project/:id/success" element={
            <ProtectedRoute>
              <SubmissionSuccess />
            </ProtectedRoute>
          } />
          
          <Route path="/project/:id/kanban" element={
            <ProtectedRoute>
              <Kanban />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;