"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const logger_1 = require("../../../config/logger");
const reviewService_1 = require("../../../application/reviewService");
const cloudinary_1 = require("../../../infrastructure/storage/cloudinary");
const parser_1 = require("../../../utils/parser");
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
            // 1. BOLA Check: Verify project ownership
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
                return;
            }
            // Extract text from document buffer
            let extractedText = null;
            try {
                extractedText = await (0, parser_1.extractTextFromBuffer)(req.file.buffer, req.file.originalname);
            }
            catch (parseError) {
                logger_1.logger.error('Failed to parse text from file upload:', parseError);
                res.status(422).json({ success: false, error: 'Could not extract readable text from this file' });
                return;
            }
            // Upload to Cloudinary from memory buffer
            const secureUrl = await (0, cloudinary_1.uploadBufferToCloudinary)(req.file.buffer, req.file.originalname);
            let savedRecord;
            if (type === 'SLIDE') {
                savedRecord = await prisma_1.prisma.slide.create({
                    data: {
                        projectId,
                        title: title || req.file.originalname,
                        fileUrl: secureUrl,
                        extractedText,
                    }
                });
            }
            else {
                savedRecord = await prisma_1.prisma.document.create({
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
        }
        catch (error) {
            logger_1.logger.error('Error uploading document:', error);
            res.status(500).json({ success: false, error: 'Failed to upload document' });
        }
    }
    static async triggerReview(req, res) {
        try {
            const documentId = req.params.documentId;
            const { type } = req.body; // type = 'CHAPTER' or 'SLIDE'
            const userId = req.user.id;
            let projectId;
            let extractedText;
            // 2. BOLA Check: Verify that the parent project belongs to the authenticated user
            if (type === 'CHAPTER') {
                const doc = await prisma_1.prisma.document.findUnique({
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
            }
            else {
                const slide = await prisma_1.prisma.slide.findUnique({
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
            const reviewResult = await reviewService_1.ReviewService.reviewDocument(projectId, documentId, extractedText, type);
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
            const userId = req.user.id;
            // 3. BOLA Check: Verify ownership of the referenced document or slide
            let docOwnerId = null;
            const doc = await prisma_1.prisma.document.findUnique({
                where: { id: documentId },
                include: { project: true }
            });
            if (doc) {
                docOwnerId = doc.project.userId;
            }
            else {
                const slide = await prisma_1.prisma.slide.findUnique({
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
    static async getDocuments(req, res) {
        try {
            const projectId = req.params.projectId;
            const userId = req.user.id;
            // BOLA check: Verify project belongs to user
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
                return;
            }
            const documents = await prisma_1.prisma.document.findMany({
                where: { projectId, deletedAt: null },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: documents });
        }
        catch (error) {
            logger_1.logger.error('Error fetching documents:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch documents' });
        }
    }
    static async getSlides(req, res) {
        try {
            const projectId = req.params.projectId;
            const userId = req.user.id;
            // BOLA check: Verify project belongs to user
            const project = await prisma_1.prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null } });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
                return;
            }
            const slides = await prisma_1.prisma.slide.findMany({
                where: { projectId, deletedAt: null },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: slides });
        }
        catch (error) {
            logger_1.logger.error('Error fetching slides:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch slides' });
        }
    }
}
exports.ReviewController = ReviewController;
