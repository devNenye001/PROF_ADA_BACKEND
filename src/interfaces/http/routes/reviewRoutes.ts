import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { documentReviewRateLimiter } from '../middlewares/rateLimiter';
import { uploadMiddleware } from '../middlewares/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/projects/:projectId/documents/upload', uploadMiddleware.single('file'), ReviewController.uploadDocument);
router.post('/documents/:documentId/review', documentReviewRateLimiter, ReviewController.triggerReview);
router.get('/documents/:documentId/feedback', ReviewController.getFeedback);

export default router;
