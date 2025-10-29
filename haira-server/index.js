import express from 'express';
import cors from 'cors';
import functions from 'firebase-functions';

import { firebaseAvailable } from './services/firebaseService.js';
import homeRoutes from './routes/HomeRoutes.js';
import profileRoutes from './routes/ProfileRoutes.js';
import loginRoutes from './routes/LoginRoutes.js';
import classroomRoutes from './routes/ClassroomRoutes.js';
import projectRoutes from './routes/ProjectRoutes.js';
import chatRoutes from './routes/ChatRoutes.js';  // Using official ChatRoutes (formerly Phase3)
import submissionRoutes from './routes/SubmissionRoutes.js';
import kanbanRoutes from './routes/KanbanRoutes.js';


const app = express();
const port = 3002;

// Allow multiple origins for development and production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', 
      'http://localhost:5174',
      'https://haira-prod.web.app',
      'https://haira-prod.firebaseapp.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware to parse JSON
app.use(express.json());


// Logging middleware to debug requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Handle preflight OPTIONS requests for all routes
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Endpoint to expose Firebase availability status
app.get('/api/config', (req, res) => {
  // Explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({ 
    firebaseAvailable,
    storageMode: firebaseAvailable ? 'firebase' : 'localStorage'
  });
});

// add all routes here 
app.use('/api', homeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/project', chatRoutes);
app.use('/api/project', submissionRoutes);
app.use('/api/project', kanbanRoutes);


// Export for Firebase Functions
export const hairaprod = functions.https.onRequest(app);

// Keep local development server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, 'localhost', () => {
    console.log(`🔌 Server is running on http://localhost:${port}`);
  });
}