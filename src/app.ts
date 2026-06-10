import express from 'express';
import cors from 'cors';
import authRoutes from './interfaces/http/routes/authRoutes';
import projectRoutes from './interfaces/http/routes/projectRoutes';
import chatRoutes from './interfaces/http/routes/chatRoutes';
import reviewRoutes from './interfaces/http/routes/reviewRoutes';
import { logger } from './config/logger';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
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
