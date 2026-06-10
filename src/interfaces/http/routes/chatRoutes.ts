import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { chatRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authMiddleware);

// Project-level conversation routes
router.get('/projects/:projectId/conversations', ChatController.getConversations);
router.post('/projects/:projectId/conversations', ChatController.createConversation);

// Conversation-level message routes (Legacy)
router.get('/conversations/:conversationId/messages', ChatController.getMessages);
router.post('/conversations/:conversationId/chat', chatRateLimiter, ChatController.chat);

// User-level conversation routes (ChatGPT-style multi-chat)
router.get('/conversations', ChatController.getUserConversations);
router.get('/conversations/:conversationId', ChatController.getConversationById);
router.post('/conversations', ChatController.createEmptyConversation);
router.patch('/conversations/:conversationId', ChatController.updateConversationTitle);
router.post('/conversations/:conversationId/messages', chatRateLimiter, ChatController.addMessageToConversation);
router.delete('/conversations/:conversationId', ChatController.deleteConversation);

export default router;
