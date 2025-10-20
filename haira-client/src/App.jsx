import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Home from './pages/Home';
import TopBar from './components/TopBar';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Classroom from './pages/Classroom';
import Project from './pages/Project';
import Chat from './pages/Chat';
import Submission from './pages/Submission';
import Kanban from './pages/Kanban';
import ProjectSelection from './pages/ProjectSelection';

// Create authentication context
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Authentication provider component
function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe; // Unsubscribe on cleanup
  }, [auth]);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated ? children : null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TopBar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <ProjectSelection />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/classroom" element={
            <ProtectedRoute>
              <Classroom />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <ProjectSelection />
            </ProtectedRoute>
          } />
          
          <Route path="/project" element={
            <ProtectedRoute>
              <Project />
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