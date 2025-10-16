import express from 'express';
import cors from 'cors';


import homeRoutes from './routes/HomeRoutes.js';
import loginRoutes from './routes/LoginRoutes.js';

const app = express();
const port = 3002;

app.use(cors({
  origin: 'http://localhost:5173',
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
app.use('/api/login', loginRoutes);



app.listen(port, () => {
  console.log(`🔌 Server is running on http://localhost:${port}`);
});