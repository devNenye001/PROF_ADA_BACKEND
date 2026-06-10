import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../config/logger';
import { ChatService } from '../../../application/chatService';
import { ProfAdaMode } from '../../../application/aiModes';

export class ChatController {
  // New User-Scoped Chat CRUD Methods
  static async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ success: true, data: conversations });
    } catch (error) {
      logger.error('Error fetching user conversations:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
    }
  }

  static async getConversationById(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const userId = (req as any).user.id;

      const conversation = await prisma.conversation.findUnique({
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
    } catch (error) {
      logger.error('Error fetching conversation details:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversation details' });
    }
  }

  static async createEmptyConversation(req: Request, res: Response): Promise<void> {
    try {
      const { title } = req.body;
      const userId = (req as any).user.id;

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title: title || 'New Conversation'
        }
      });
      res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      logger.error('Error creating empty conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  }

  static async updateConversationTitle(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const { title } = req.body;
      const userId = (req as any).user.id;

      if (!title || typeof title !== 'string') {
        res.status(400).json({ success: false, error: 'Title is required and must be a string' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
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

      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { title }
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Error updating conversation title:', error);
      res.status(500).json({ success: false, error: 'Failed to update conversation title' });
    }
  }

  static async addMessageToConversation(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const { content, mode } = req.body;
      const userId = (req as any).user.id;

      if (!content || typeof content !== 'string') {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
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

      const aiResponse = await ChatService.processMessage(
        conversation.projectId,
        conversationId,
        content,
        (mode as ProfAdaMode) || ProfAdaMode.RESEARCH_GAP_REVIEW
      );

      res.status(201).json({
        success: true,
        data: {
          studentMessage: aiResponse.studentMessage,
          profMessage: aiResponse.profMessage,
          structuredData: aiResponse.structuredData
        }
      });
    } catch (error) {
      logger.error('Error adding message and generating response:', error);
      res.status(500).json({ success: false, error: 'Failed to add message' });
    }
  }

  static async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const userId = (req as any).user.id;

      const conversation = await prisma.conversation.findUnique({
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

      await prisma.conversation.delete({
        where: { id: conversationId }
      });

      res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to delete conversation' });
    }
  }

  // Legacy/Project-Level conversation routes (Refactored to match new schema)
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user.id;

      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const conversations = await prisma.conversation.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ success: true, data: conversations });
    } catch (error) {
      logger.error('Error fetching conversations:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
    }
  }

  static async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const { topic } = req.body;
      const userId = (req as any).user.id;

      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const conversation = await prisma.conversation.create({
        data: { projectId, topic, userId, title: topic || 'New Project Conversation' }
      });
      res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      logger.error('Error creating conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  }

  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const userId = (req as any).user.id;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      if (!conversation) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      const project = await prisma.project.findFirst({ where: { id: conversation.projectId || '', userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Conversation project not found or inaccessible' });
        return;
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' }
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      logger.error('Error fetching messages:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  }

  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const { message, mode } = req.body;
      const userId = (req as any).user.id;

      if (!message || !mode) {
        res.status(400).json({ success: false, error: 'Message and mode are required' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      if (!conversation) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      const project = await prisma.project.findFirst({ where: { id: conversation.projectId || '', userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Conversation project not found or inaccessible' });
        return;
      }

      const aiResponse = await ChatService.processMessage(
        conversation.projectId,
        conversationId,
        message,
        mode as ProfAdaMode
      );

      res.json({ success: true, data: aiResponse });
    } catch (error) {
      logger.error('Error in chat:', error);
      res.status(500).json({ success: false, error: 'Failed to process chat message' });
    }
  }
}
