import { Router } from 'express';
import { googleLogin, googleLoginRedirect, requestMagicLink, verifyMagicLink, refreshAccessToken, supabaseLogin } from '../controllers/authController';

const router = Router();

router.post('/supabase', supabaseLogin);
router.post('/google', googleLogin);
router.post('/google/callback', googleLoginRedirect);
router.post('/email/magic-link', requestMagicLink);
router.get('/email/verify', verifyMagicLink);
router.post('/refresh', refreshAccessToken);

export default router;

