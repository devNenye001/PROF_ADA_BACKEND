"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const logger_1 = require("../../../config/logger");
const reviewService_1 = require("../../../application/reviewService");
const cloudinary_1 = require("../../../infrastructure/storage/cloudinary");
class ReviewController {
    static async uploadDocument(req, res) {
        try {
            const projectId = req.params.projectId;
            const { title, chapterNumber, type } = req.body; // type = 'CHAPTER' or 'SLIDE'
            const userId = req.user.id;
            if (!req.file || !req.file.buffer) {
                res.status(400).json({ success: false, error: 'File buffer is required' });
                return;
            }
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            // Upload to Cloudinary from memory buffer
            const secureUrl = await (0, cloudinary_1.uploadBufferToCloudinary)(req.file.buffer, req.file.originalname);
            let savedRecord;
            if (type === 'SLIDE') {
                savedRecord = await prisma_1.prisma.slide.create({
                    data: {
                        projectId,
                        title,
                        fileUrl: secureUrl,
                    }
                });
            }
            else {
                savedRecord = await prisma_1.prisma.document.create({
                    data: {
                        projectId,
                        title,
                        chapterNumber: chapterNumber ? parseInt(chapterNumber, 10) : null,
                        fileUrl: secureUrl,
                    }
                });
            }
            res.status(201).json({ success: true, data: savedRecord });
        }
        catch (error) {
            logger_1.logger.error('Error uploading document:', error);
            res.status(500).json({ success: false, error: 'Failed to upload document' });
        }
    }
    static async triggerReview(req, res) {
        try {
            const documentId = req.params.documentId;
            const { type, documentText } = req.body; // type = 'CHAPTER' or 'SLIDE'
            if (!documentText) {
                res.status(400).json({ success: false, error: 'Extracted documentText is required for AI review' });
                return;
            }
            let projectId;
            if (type === 'CHAPTER') {
                const doc = await prisma_1.prisma.document.findUnique({ where: { id: documentId } });
                if (!doc) {
                    res.status(404).json({ success: false, error: 'Document not found' });
                    return;
                }
                projectId = doc.projectId;
            }
            else {
                const slide = await prisma_1.prisma.slide.findUnique({ where: { id: documentId } });
                if (!slide) {
                    res.status(404).json({ success: false, error: 'Slide not found' });
                    return;
                }
                projectId = slide.projectId;
            }
            const reviewResult = await reviewService_1.ReviewService.reviewDocument(projectId, documentId, documentText, type);
            res.json({ success: true, data: reviewResult });
        }
        catch (error) {
            logger_1.logger.error('Error triggering review:', error);
            res.status(500).json({ success: false, error: 'Failed to generate review' });
        }
    }
    static async getFeedback(req, res) {
        try {
            const documentId = req.params.documentId;
            const feedbacks = await prisma_1.prisma.feedback.findMany({
                where: {
                    OR: [
                        { documentId },
                        { slideId: documentId }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: feedbacks });
        }
        catch (error) {
            logger_1.logger.error('Error fetching feedback:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
        }
    }
}
exports.ReviewController = ReviewController;
