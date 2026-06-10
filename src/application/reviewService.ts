import { generateAIContent } from '../infrastructure/ai/gemini';
import { prisma } from '../infrastructure/database/prisma';
import { ProfAdaMode, ModeSystemPrompts, ChapterReviewSchema } from './aiModes';
import { logger } from '../config/logger';
import { FeedbackCategory, FeedbackSeverity } from '@prisma/client';

export class ReviewService {
  static async reviewDocument(projectId: string, documentId: string, documentText: string, type: 'CHAPTER' | 'SLIDE'): Promise<any> {
    try {
      const mode = type === 'CHAPTER' ? ProfAdaMode.CHAPTER_REVIEW : ProfAdaMode.SLIDE_REVIEW;
      const systemPrompt = ModeSystemPrompts[mode] + "\n\nCRITICAL: Return output strictly in the requested JSON format.";

      const jsonString = await generateAIContent(
        "Analyze the following document and provide structural, grammatical, and academic feedback.",
        documentText,
        {
          systemPrompt,
          temperature: 0.2, // Low temperature for deterministic analysis
          responseSchema: ChapterReviewSchema
        }
      );

      let parsedReview;
      try {
        parsedReview = JSON.parse(jsonString);
      } catch (e) {
        logger.error('Review parsing failed. Retrying or falling back.', e);
        throw new Error('Failed to parse document review.');
      }

      // Store feedback items in DB
      for (const feedback of parsedReview.feedbacks) {
        await prisma.feedback.create({
          data: {
            documentId: type === 'CHAPTER' ? documentId : null,
            slideId: type === 'SLIDE' ? documentId : null,
            category: feedback.category as FeedbackCategory,
            content: `Quote: "${feedback.quote}"\nIssue: ${feedback.issue}\nHint: ${feedback.improvementHint}`,
            severity: feedback.severity as FeedbackSeverity,
          }
        });
      }

      return parsedReview;
    } catch (error) {
      logger.error('ReviewService Error:', error);
      throw error;
    }
  }
}
