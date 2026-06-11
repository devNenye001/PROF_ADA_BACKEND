import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../config/logger';
import { ReviewService } from '../../../application/reviewService';
import { uploadBufferToCloudinary } from '../../../infrastructure/storage/cloudinary';
import { extractTextFromBuffer } from '../../../utils/parser';

export class ReviewController {
  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const { title, chapterNumber, type } = req.body; // type = 'CHAPTER' or 'SLIDE'
      const userId = (req as any).user.id;

      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, error: 'File buffer is required' });
        return;
      }

      // 1. BOLA Check: Verify project ownership
      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
        return;
      }

      // Extract text from document buffer
      let extractedText = null;
      try {
        extractedText = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
      } catch (parseError) {
        logger.error('Failed to parse text from file upload:', parseError);
        res.status(422).json({ success: false, error: 'Could not extract readable text from this file' });
        return;
      }

      // Upload to Cloudinary from memory buffer
      const secureUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      
      let savedRecord;
      if (type === 'SLIDE') {
        savedRecord = await prisma.slide.create({
          data: {
            projectId,
            title: title || req.file.originalname,
            fileUrl: secureUrl,
            extractedText,
          }
        });
      } else {
        savedRecord = await prisma.document.create({
          data: {
            projectId,
            title: title || req.file.originalname,
            chapterNumber: chapterNumber ? parseInt(chapterNumber, 10) : null,
            fileUrl: secureUrl,
            extractedText,
          }
        });
      }

      res.status(201).json({ success: true, data: savedRecord });
    } catch (error) {
      logger.error('Error uploading document:', error);
      res.status(500).json({ success: false, error: 'Failed to upload document' });
    }
  }

  static async triggerReview(req: Request, res: Response): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const { type } = req.body; // type = 'CHAPTER' or 'SLIDE'
      const userId = (req as any).user.id;

      let projectId;
      let extractedText;

      // 2. BOLA Check: Verify that the parent project belongs to the authenticated user
      if (type === 'CHAPTER') {
        const doc = await prisma.document.findUnique({ 
          where: { id: documentId },
          include: { project: true }
        });
        if (!doc || doc.project.deletedAt !== null) { 
          res.status(404).json({ success: false, error: 'Document not found' }); 
          return; 
        }
        if (doc.project.userId !== userId) {
          res.status(403).json({ success: false, error: 'Unauthorized: You do not own this document' });
          return;
        }
        projectId = doc.projectId;
        extractedText = doc.extractedText;
      } else {
        const slide = await prisma.slide.findUnique({ 
          where: { id: documentId },
          include: { project: true }
        });
        if (!slide || slide.project.deletedAt !== null) { 
          res.status(404).json({ success: false, error: 'Slide not found' }); 
          return; 
        }
        if (slide.project.userId !== userId) {
          res.status(403).json({ success: false, error: 'Unauthorized: You do not own this slide' });
          return;
        }
        projectId = slide.projectId;
        extractedText = slide.extractedText;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        res.status(400).json({ success: false, error: 'This file contains no extractable text. Please upload a valid document.' });
        return;
      }

      const reviewResult = await ReviewService.reviewDocument(projectId, documentId, extractedText, type);

      res.json({ success: true, data: reviewResult });
    } catch (error) {
      logger.error('Error triggering review:', error);
      res.status(500).json({ success: false, error: 'Failed to generate review' });
    }
  }

  static async getFeedback(req: Request, res: Response): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const userId = (req as any).user.id;

      // 3. BOLA Check: Verify ownership of the referenced document or slide
      let docOwnerId = null;

      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: { project: true }
      });
      if (doc) {
        docOwnerId = doc.project.userId;
      } else {
        const slide = await prisma.slide.findUnique({
          where: { id: documentId },
          include: { project: true }
        });
        if (slide) {
          docOwnerId = slide.project.userId;
        }
      }

      if (!docOwnerId || docOwnerId !== userId) {
        res.status(403).json({ success: false, error: 'Unauthorized to access feedback for this asset' });
        return;
      }
      
      const feedbacks = await prisma.feedback.findMany({
        where: {
          OR: [
            { documentId },
            { slideId: documentId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: feedbacks });
    } catch (error) {
      logger.error('Error fetching feedback:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
    }
  }

  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user.id;

      // BOLA check: Verify project belongs to user
      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
        return;
      }

      const documents = await prisma.document.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: documents });
    } catch (error) {
      logger.error('Error fetching documents:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
  }

  static async getSlides(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user.id;

      // BOLA check: Verify project belongs to user
      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
        return;
      }

      const slides = await prisma.slide.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: slides });
    } catch (error) {
      logger.error('Error fetching slides:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch slides' });
    }
  }
}

