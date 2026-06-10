"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const logger_1 = require("../../../config/logger");
const chatService_1 = require("../../../application/chatService");
class ChatController {
    static async getConversations(req, res) {
        try {
            const projectId = req.params.projectId;
            const userId = req.user.id;
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            const conversations = await prisma_1.prisma.conversation.findMany({
                where: { projectId },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({ success: true, data: conversations });
        }
        catch (error) {
            logger_1.logger.error('Error fetching conversations:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
        }
    }
    static async createConversation(req, res) {
        try {
            const projectId = req.params.projectId;
            const { topic } = req.body;
            const userId = req.user.id;
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            const conversation = await prisma_1.prisma.conversation.create({
                data: { projectId, topic }
            });
            res.status(201).json({ success: true, data: conversation });
        }
        catch (error) {
            logger_1.logger.error('Error creating conversation:', error);
            res.status(500).json({ success: false, error: 'Failed to create conversation' });
        }
    }
    static async getMessages(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const userId = req.user.id;
            const conversation = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            const project = await prisma_1.prisma.project.findFirst({ where: { id: conversation.projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Conversation project not found or inaccessible' });
                return;
            }
            const messages = await prisma_1.prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' }
            });
            res.json({ success: true, data: messages });
        }
        catch (error) {
            logger_1.logger.error('Error fetching messages:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch messages' });
        }
    }
    static async chat(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const { message, mode } = req.body;
            const userId = req.user.id;
            if (!message || !mode) {
                res.status(400).json({ success: false, error: 'Message and mode are required' });
                return;
            }
            const conversation = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            const project = await prisma_1.prisma.project.findFirst({ where: { id: conversation.projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Conversation project not found or inaccessible' });
                return;
            }
            const aiResponse = await chatService_1.ChatService.processMessage(conversation.projectId, conversationId, message, mode);
            res.json({ success: true, data: aiResponse });
        }
        catch (error) {
            logger_1.logger.error('Error in chat:', error);
            res.status(500).json({ success: false, error: 'Failed to process chat message' });
        }
    }
}
exports.ChatController = ChatController;
