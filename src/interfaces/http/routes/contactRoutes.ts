import { Router } from 'express';
import { ContactController } from '../controllers/contactController';

const router = Router();

// Public route
router.post('/', ContactController.submitContact);

export default router;
