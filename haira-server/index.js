import express from 'express';
import cors from 'cors';


import homeRoutes from './routes/HomeRoutes.js';
import profileRoutes from './routes/ProfileRoutes.js';
import loginRoutes from './routes/LoginRoutes.js';
import classroomRoutes from './routes/ClassroomRoutes.js';
import projectRoutes from './routes/ProjectRoutes.js';
import chatRoutes from './routes/ChatRoutes.js';  // Using official ChatRoutes (formerly Phase3)
import submissionRoutes from './routes/SubmissionRoutes.js';
import kanbanRoutes from './routes/KanbanRoutes.js';
import notifRoutes from './routes/NofiticationRoutes.js';

const app = express();
const port = 3002;

// Allow multiple origins for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Middleware to parse JSON
app.use(express.json());


// Logging middleware to debug requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
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
app.use('/api', notifRoutes);

app.listen(port, () => {
  console.log(`🔌 Server is running on http://localhost:${port}`);
});