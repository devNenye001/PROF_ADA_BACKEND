"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const gemini_1 = require("../infrastructure/ai/gemini");
const prisma_1 = require("../infrastructure/database/prisma");
const aiModes_1 = require("./aiModes");
const logger_1 = require("../config/logger");
class ReviewService {
    static async reviewDocument(projectId, documentId, documentText, type) {
        try {
            const mode = type === 'CHAPTER' ? aiModes_1.ProfAdaMode.CHAPTER_REVIEW : aiModes_1.ProfAdaMode.SLIDE_REVIEW;
            const systemPrompt = aiModes_1.ModeSystemPrompts[mode] + "\n\nCRITICAL: Return output strictly in the requested JSON format.";
            const jsonString = await (0, gemini_1.generateAIContent)("Analyze the following document and provide structural, grammatical, and academic feedback.", documentText, {
                systemPrompt,
                temperature: 0.2, // Low temperature for deterministic analysis
                responseSchema: aiModes_1.ChapterReviewSchema
            });
            let parsedReview;
            try {
                parsedReview = JSON.parse(jsonString);
            }
            catch (e) {
                logger_1.logger.error('Review parsing failed. Retrying or falling back.', e);
                throw new Error('Failed to parse document review.');
            }
            // Store feedback items in DB
            for (const feedback of parsedReview.feedbacks) {
                await prisma_1.prisma.feedback.create({
                    data: {
                        documentId: type === 'CHAPTER' ? documentId : null,
                        slideId: type === 'SLIDE' ? documentId : null,
                        category: feedback.category,
                        content: `Quote: "${feedback.quote}"\nIssue: ${feedback.issue}\nHint: ${feedback.improvementHint}`,
                        severity: feedback.severity,
                    }
                });
            }
            return parsedReview;
        }
        catch (error) {
            logger_1.logger.error('ReviewService Error:', error);
            throw error;
        }
    }
}
exports.ReviewService = ReviewService;
