import express from 'express';
import cors from 'cors';
import projectRoutes from './interfaces/http/routes/projectRoutes';
import chatRoutes from './interfaces/http/routes/chatRoutes';
import reviewRoutes from './interfaces/http/routes/reviewRoutes';
import { logger } from './config/logger';

const app = express();

const allowedOrigins = [
  'https://prof-adang.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api', chatRoutes); // contains /projects/:id/conversations & /conversations/:id/chat
app.use('/api', reviewRoutes); // contains /projects/:id/documents/upload & /documents/:id/review

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Prof. Ada backend is running smoothly' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

export default app;
