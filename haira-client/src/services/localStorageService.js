/*
 * localStorageService.js
 * 
 * Client-side localStorage service that provides fallback functionality
 * when Firebase is not available or service account is missing.
 * 
 * This service mimics Firebase Auth and Firestore behavior using localStorage.
 */

// Mock user object structure
const createMockUser = (uid, email, displayName, photoURL = null) => ({
  uid,
  email,
  displayName,
  photoURL,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: Date.now(),
    lastSignInTime: Date.now()
  },
  providerData: [{
    providerId: 'local',
    uid: uid,
    displayName: displayName,
    email: email,
    photoURL: photoURL
  }],
  getIdToken: async () => `mock-token-${uid}-${Date.now()}`,
  getIdTokenResult: async () => ({
    token: `mock-token-${uid}-${Date.now()}`,
    authTime: Date.now(),
    issuedAtTime: Date.now(),
    expirationTime: Date.now() + (60 * 60 * 1000), // 1 hour
    signInProvider: 'local',
    signInSecondFactor: null,
    claims: {
      aud: 'local',
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + (60 * 60 * 1000)) / 1000),
      iat: Math.floor(Date.now() / 1000),
      iss: 'local',
      sub: uid
    }
  })
});

// Storage keys
const STORAGE_KEYS = {
  CURRENT_USER: '__localStorage_current_user__',
  USER_DATA: '__localStorage_user_data__',
  PROJECTS: '__localStorage_projects__',
  CHAT_MESSAGES: '__localStorage_chat_messages__',
  TASKS: '__localStorage_tasks__'
};

// Check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// LocalStorage helper functions
const getFromStorage = (key, defaultValue = null) => {
  if (!isBrowser()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return defaultValue;
  }
};

const setToStorage = (key, value) => {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key ${key}:`, error);
    return false;
  }
};

const removeFromStorage = (key) => {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key ${key}:`, error);
    return false;
  }
};

// Mock Firebase Auth functions
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Initialize with stored user if available
    const storedUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    if (storedUser) {
      mockAuth.currentUser = createMockUser(
        storedUser.uid,
        storedUser.email,
        storedUser.displayName,
        storedUser.photoURL
      );
    }
    
    // Call the callback immediately with current user
    callback(mockAuth.currentUser);
    
    // Return unsubscribe function
    return () => {};
  },
  
  signInWithEmailAndPassword: async (email, password) => {
    // Simple mock authentication - in real implementation, you'd validate credentials
    const mockUser = createMockUser(
      `user_${Date.now()}`,
      email,
      email.split('@')[0], // Use email prefix as display name
      null
    );
    
    mockAuth.currentUser = mockUser;
    setToStorage(STORAGE_KEYS.CURRENT_USER, {
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      photoURL: mockUser.photoURL
    });
    
    return { user: mockUser };
  },
  
  createUserWithEmailAndPassword: async (email, password) => {
    return mockAuth.signInWithEmailAndPassword(email, password);
  },
  
  signInWithPopup: async (provider) => {
    // Mock Google sign-in
    const mockUser = createMockUser(
      `google_user_${Date.now()}`,
      'user@gmail.com',
      'Google User',
      'https://via.placeholder.com/150'
    );
    
    mockAuth.currentUser = mockUser;
    setToStorage(STORAGE_KEYS.CURRENT_USER, {
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      photoURL: mockUser.photoURL
    });
    
    return { user: mockUser };
  },
  
  signOut: async () => {
    mockAuth.currentUser = null;
    removeFromStorage(STORAGE_KEYS.CURRENT_USER);
  }
};

// Mock Firestore functions
export const mockFirestore = {
  collection: (collectionName) => ({
    doc: (docId) => ({
      get: async () => {
        const data = getFromStorage(`${STORAGE_KEYS.USER_DATA}_${collectionName}_${docId}`, null);
        return {
          exists: () => !!data,
          data: () => data,
          id: docId
        };
      },
      set: async (data) => {
        setToStorage(`${STORAGE_KEYS.USER_DATA}_${collectionName}_${docId}`, data);
        return { id: docId };
      },
      update: async (data) => {
        const existing = getFromStorage(`${STORAGE_KEYS.USER_DATA}_${collectionName}_${docId}`, {});
        const updated = { ...existing, ...data };
        setToStorage(`${STORAGE_KEYS.USER_DATA}_${collectionName}_${docId}`, updated);
        return { id: docId };
      }
    }),
    add: async (data) => {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setToStorage(`${STORAGE_KEYS.USER_DATA}_${collectionName}_${docId}`, { ...data, id: docId });
      return { id: docId };
    }
  })
};

// Check if Firebase is available
export const isFirebaseAvailable = () => {
  try {
    // Check if Firebase modules are available
    const firebase = require('firebase/app');
    const auth = require('firebase/auth');
    const firestore = require('firebase/firestore');
    return !!(firebase && auth && firestore);
  } catch (error) {
    return false;
  }
};

// Get appropriate auth service (Firebase or localStorage fallback)
export const getAuthService = () => {
  if (isFirebaseAvailable()) {
    try {
      const { getAuth } = require('firebase/auth');
      return getAuth();
    } catch (error) {
      console.warn('Firebase Auth not available, falling back to localStorage:', error);
      return mockAuth;
    }
  } else {
    return mockAuth;
  }
};

// Get appropriate firestore service (Firebase or localStorage fallback)
export const getFirestoreService = () => {
  if (isFirebaseAvailable()) {
    try {
      const { getFirestore } = require('firebase/firestore');
      return getFirestore();
    } catch (error) {
      console.warn('Firebase Firestore not available, falling back to localStorage:', error);
      return mockFirestore;
    }
  } else {
    return mockFirestore;
  }
};

// Utility function to check if user is authenticated
export const isUserAuthenticated = () => {
  const auth = getAuthService();
  return !!auth.currentUser;
};

// Utility function to get current user
export const getCurrentUser = () => {
  const auth = getAuthService();
  return auth.currentUser;
};

// Utility function to clear all localStorage data
export const clearLocalStorageData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromStorage(key);
  });
  // Also clear any collection-specific data
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('__localStorage_user_data_')) {
      removeFromStorage(key);
    }
  });
};

export default {
  mockAuth,
  mockFirestore,
  isFirebaseAvailable,
  getAuthService,
  getFirestoreService,
  isUserAuthenticated,
  getCurrentUser,
  clearLocalStorageData
};
