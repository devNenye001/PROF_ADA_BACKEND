import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../config/logger';
import { ReviewService } from '../../../application/reviewService';
import { uploadBufferToCloudinary } from '../../../infrastructure/storage/cloudinary';

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

      const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      // Upload to Cloudinary from memory buffer
      const secureUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      
      let savedRecord;
      if (type === 'SLIDE') {
        savedRecord = await prisma.slide.create({
          data: {
            projectId,
            title,
            fileUrl: secureUrl,
          }
        });
      } else {
        savedRecord = await prisma.document.create({
          data: {
            projectId,
            title,
            chapterNumber: chapterNumber ? parseInt(chapterNumber, 10) : null,
            fileUrl: secureUrl,
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
      const { type, documentText } = req.body; // type = 'CHAPTER' or 'SLIDE'

      if (!documentText) {
        res.status(400).json({ success: false, error: 'Extracted documentText is required for AI review' });
        return;
      }

      let projectId;
      if (type === 'CHAPTER') {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) { res.status(404).json({ success: false, error: 'Document not found' }); return; }
        projectId = doc.projectId;
      } else {
        const slide = await prisma.slide.findUnique({ where: { id: documentId } });
        if (!slide) { res.status(404).json({ success: false, error: 'Slide not found' }); return; }
        projectId = slide.projectId;
      }

      const reviewResult = await ReviewService.reviewDocument(projectId, documentId, documentText, type);

      res.json({ success: true, data: reviewResult });
    } catch (error) {
      logger.error('Error triggering review:', error);
      res.status(500).json({ success: false, error: 'Failed to generate review' });
    }
  }

  static async getFeedback(req: Request, res: Response): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      
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
}
