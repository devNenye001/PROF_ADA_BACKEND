"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const logger_1 = require("../../../config/logger");
const chatService_1 = require("../../../application/chatService");
const aiModes_1 = require("../../../application/aiModes");
class ChatController {
    // New User-Scoped Chat CRUD Methods
    static async getUserConversations(req, res) {
        try {
            const userId = req.user.id;
            const conversations = await prisma_1.prisma.conversation.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({ success: true, data: conversations });
        }
        catch (error) {
            logger_1.logger.error('Error fetching user conversations:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
        }
    }
    static async getConversationById(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const userId = req.user.id;
            const conversation = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    messages: {
                        orderBy: { timestamp: 'asc' }
                    }
                }
            });
            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            if (conversation.userId !== userId) {
                res.status(403).json({ success: false, error: 'Unauthorized: Cannot access this conversation' });
                return;
            }
            res.json({ success: true, data: conversation });
        }
        catch (error) {
            logger_1.logger.error('Error fetching conversation details:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch conversation details' });
        }
    }
    static async createEmptyConversation(req, res) {
        try {
            const { title } = req.body;
            const userId = req.user.id;
            const conversation = await prisma_1.prisma.conversation.create({
                data: {
                    userId,
                    title: title || 'New Conversation'
                }
            });
            res.status(201).json({ success: true, data: conversation });
        }
        catch (error) {
            logger_1.logger.error('Error creating empty conversation:', error);
            res.status(500).json({ success: false, error: 'Failed to create conversation' });
        }
    }
    static async updateConversationTitle(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const { title } = req.body;
            const userId = req.user.id;
            if (!title || typeof title !== 'string') {
                res.status(400).json({ success: false, error: 'Title is required and must be a string' });
                return;
            }
            const conversation = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            if (conversation.userId !== userId) {
                res.status(403).json({ success: false, error: 'Unauthorized to modify this conversation' });
                return;
            }
            const updated = await prisma_1.prisma.conversation.update({
                where: { id: conversationId },
                data: { title }
            });
            res.json({ success: true, data: updated });
        }
        catch (error) {
            logger_1.logger.error('Error updating conversation title:', error);
            res.status(500).json({ success: false, error: 'Failed to update conversation title' });
        }
    }
    static async addMessageToConversation(req, res) {
        try {
            const conversationId = req.params.conversationId;
            const { content, mode } = req.body;
            const userId = req.user.id;
            if (!content || typeof content !== 'string') {
                res.status(400).json({ success: false, error: 'Message content is required' });
                return;
            }
            const conversation = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            if (conversation.userId !== userId) {
                res.status(403).json({ success: false, error: 'Unauthorized to add message to this conversation' });
                return;
            }
            const aiResponse = await chatService_1.ChatService.processMessage(conversation.projectId, conversationId, content, mode || aiModes_1.ProfAdaMode.RESEARCH_GAP_REVIEW);
            res.status(201).json({
                success: true,
                data: {
                    studentMessage: aiResponse.studentMessage,
                    profMessage: aiResponse.profMessage,
                    structuredData: aiResponse.structuredData
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error adding message and generating response:', error);
            res.status(500).json({ success: false, error: 'Failed to add message' });
        }
    }
    static async deleteConversation(req, res) {
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
            if (conversation.userId !== userId) {
                res.status(403).json({ success: false, error: 'Unauthorized to delete this conversation' });
                return;
            }
            await prisma_1.prisma.conversation.delete({
                where: { id: conversationId }
            });
            res.json({ success: true, message: 'Conversation deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting conversation:', error);
            res.status(500).json({ success: false, error: 'Failed to delete conversation' });
        }
    }
    // Legacy/Project-Level conversation routes (Refactored to match new schema)
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
                data: { projectId, topic, userId, title: topic || 'New Project Conversation' }
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
            const project = await prisma_1.prisma.project.findFirst({ where: { id: conversation.projectId || '', userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Conversation project not found or inaccessible' });
                return;
            }
            const messages = await prisma_1.prisma.message.findMany({
                where: { conversationId },
                orderBy: { timestamp: 'asc' }
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
            const project = await prisma_1.prisma.project.findFirst({ where: { id: conversation.projectId || '', userId, deletedAt: null } });
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
