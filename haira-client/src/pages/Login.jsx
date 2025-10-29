import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, serverFirebaseAvailable } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-login test user when Firebase is not available
  useEffect(() => {
    if (!serverFirebaseAvailable) {
      
      // Create test user in localStorage
      const testUser = {
        uid: 'test-user',
        email: 'hello@test.com',
        displayName: 'Test User',
        photoURL: null
      };
      
      localStorage.setItem('__localStorage_current_user__', JSON.stringify(testUser));
      
      // Dispatch event to notify AuthProvider
      window.dispatchEvent(new CustomEvent('localStorageAuthChange'));
      
      // Navigate to projects
      navigate('/projects', { replace: true });
    }
  }, [navigate]);

  // Create or update user document in Firestore or localStorage
  const createUserDocument = async (user, displayName) => {
    try {
      // Check if Firebase is available (db object exists and has Firestore methods)
      const isFirebaseDb = db && typeof db.collection === 'function';
      
      if (isFirebaseDb) {
        // Use Firebase Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        // Only create if user doesn't exist, or update name if it changed
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            name: displayName || user.displayName || 'Anonymous',
            email: user.email,
            activeProjectId: null,
            // Add new schema fields for profile
            summary: {
              xp: 0,
              level: 1,
              totalProjectsCompleted: 0,
              averageGrade: 0,
              achievements: []
            },
            preferences: {
              language: 'en'
            }
          });
        } else {
          // Update name if it changed
          const currentData = userDoc.data();
          
          const updates = {};
          
          if (currentData.name !== displayName && displayName) {
            updates.name = displayName;
          }
          
          // Ensure the new schema fields exist
          if (!currentData.summary) {
            updates.summary = {
              xp: 0,
              level: 1,
              totalProjectsCompleted: 0,
              averageGrade: 0,
              achievements: []
            };
          }
          
          if (!currentData.preferences) {
            updates.preferences = {
              language: 'en'
            };
          }
          
          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            await setDoc(userRef, updates, { merge: true });
          }
        }
      } else {
        // Use localStorage fallback
        const userData = {
          name: displayName || user.displayName || 'Anonymous',
          email: user.email,
          activeProjectId: null,
          summary: {
            xp: 0,
            level: 1,
            totalProjectsCompleted: 0,
            averageGrade: 0,
            achievements: []
          },
          preferences: {
            language: 'en'
          }
        };
        
        // Store in localStorage
        localStorage.setItem(`__localStorage_user_data_users_${user.uid}`, JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Error creating/updating user document:', err);
      throw new Error('Failed to create user profile');
    }
  };

  // Handle Email/Password Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Check if server has Firebase available
      const isFirebaseAuth = serverFirebaseAvailable;
      
      if (isFirebaseAuth) {
        // Use Firebase authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update display name in Firebase Auth
        await updateProfile(userCredential.user, {
          displayName: name
        });

        // Create user document in Firestore
        await createUserDocument(userCredential.user, name);

        navigate('/projects'); // Redirect to project selection page
      } else {
        // Use localStorage fallback
        const mockUser = {
          uid: `user_${Date.now()}`,
          email: email,
          displayName: name,
          photoURL: null
        };
        
        // Store user in localStorage
        localStorage.setItem('__localStorage_current_user__', JSON.stringify({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          photoURL: mockUser.photoURL
        }));
        
        // Create user document
        await createUserDocument(mockUser, name);
        
        // Dispatch custom event to notify AuthProvider
        window.dispatchEvent(new CustomEvent('localStorageAuthChange'));
        
        navigate('/projects');
      }
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try logging in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Use at least 6 characters.');
          break;
        default:
          setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if server has Firebase available
      const isFirebaseAuth = serverFirebaseAvailable;
      
      if (isFirebaseAuth) {
        // Use Firebase authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Ensure user document exists (in case it was deleted)
        await createUserDocument(userCredential.user, userCredential.user.displayName);

        navigate('/projects'); // Redirect to project selection page
      } else {
        // Use localStorage fallback
        const mockUser = {
          uid: `user_${Date.now()}`,
          email: email,
          displayName: email.split('@')[0],
          photoURL: null
        };
        
        // Store user in localStorage
        localStorage.setItem('__localStorage_current_user__', JSON.stringify({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          photoURL: mockUser.photoURL
        }));
        
        // Create user document
        await createUserDocument(mockUser, mockUser.displayName);
        
        // Dispatch custom event to notify AuthProvider
        window.dispatchEvent(new CustomEvent('localStorageAuthChange'));
        
        navigate('/projects');
      }
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        default:
          setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      // Check if server has Firebase available
      const isFirebaseAuth = serverFirebaseAvailable;
      
      if (isFirebaseAuth) {
        // Use Firebase authentication
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        
        // Create or update user document in Firestore
        await createUserDocument(userCredential.user, userCredential.user.displayName);

        navigate('/projects'); // Redirect to project selection page
      } else {
        // Use localStorage fallback
        const mockUser = {
          uid: `google_user_${Date.now()}`,
          email: 'user@gmail.com',
          displayName: 'Google User',
          photoURL: 'https://via.placeholder.com/150'
        };
        
        // Store user in localStorage
        localStorage.setItem('__localStorage_current_user__', JSON.stringify({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          photoURL: mockUser.photoURL
        }));
        
        // Create user document
        await createUserDocument(mockUser, mockUser.displayName);
        
        // Dispatch custom event to notify AuthProvider
        window.dispatchEvent(new CustomEvent('localStorageAuthChange'));
        
        navigate('/projects');
      }
    } catch (err) {
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign in cancelled.');
          break;
        case 'auth/popup-blocked':
          setError('Popup was blocked. Please allow popups for this site.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('An account already exists with the same email but different sign-in method.');
          break;
        default:
          setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">hAIra</h1>
          <p className="login-subtitle">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="form-input"
                required={isSignUp}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
              disabled={loading}
              minLength={6}
            />
            {isSignUp && (
              <p className="form-hint">At least 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span>
                Processing...
              </span>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="divider">
          <span className="divider-text">Or continue with</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-google"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="login-footer">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setName('');
            }}
            disabled={loading}
            className="toggle-auth-btn"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}