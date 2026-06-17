import { Router } from 'express';
import { FeedbackController } from '../controllers/feedbackController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', FeedbackController.submitFeedback);

export default router;
