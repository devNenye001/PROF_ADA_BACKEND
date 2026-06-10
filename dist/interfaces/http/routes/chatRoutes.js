"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// Project-level conversation routes
router.get('/projects/:projectId/conversations', chatController_1.ChatController.getConversations);
router.post('/projects/:projectId/conversations', chatController_1.ChatController.createConversation);
// Conversation-level message routes
router.get('/conversations/:conversationId/messages', chatController_1.ChatController.getMessages);
router.post('/conversations/:conversationId/chat', rateLimiter_1.chatRateLimiter, chatController_1.ChatController.chat);
exports.default = router;
