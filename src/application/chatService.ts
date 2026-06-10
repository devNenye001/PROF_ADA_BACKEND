import { generateAIContent } from '../infrastructure/ai/gemini';
import { prisma } from '../infrastructure/database/prisma';
import { ProfAdaMode, ModeSystemPrompts, TopicSuggestionSchema } from './aiModes';
import { logger } from '../config/logger';

export class ChatService {
  static async getConversationContext(projectId: string | null | undefined, conversationId: string) {
    let projectContext = "Project Title: Unknown\nStudent Department: Unknown\nProject Status: Unknown";

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          user: true,
        }
      });

      if (project) {
        projectContext = `Project Title: ${project.title || 'Unknown'}
Student Department: ${project.user?.department || 'Unknown'}
Project Status: ${project.status || 'Unknown'}`;
      }
    } else {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: true,
        }
      });
      if (conversation?.user) {
        projectContext = `Student Department: ${conversation.user.department || 'Unknown'}`;
      }
    }

    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Reverse to chronological order
    const chatHistory = recentMessages.reverse().map(m => `${m.role === 'student' ? 'USER' : 'AI'}: ${m.content}`).join('\n');

    return { projectContext, chatHistory };
  }

  static async processMessage(
    projectId: string | null | undefined,
    conversationId: string,
    userMessage: string,
    mode: ProfAdaMode = ProfAdaMode.RESEARCH_GAP_REVIEW
  ): Promise<any> {
    try {
      const { projectContext, chatHistory } = await this.getConversationContext(projectId, conversationId);

      // Save Student Message
      const studentMsg = await prisma.message.create({
        data: {
          conversationId,
          role: 'student',
          content: userMessage,
        }
      });

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      const systemPrompt = ModeSystemPrompts[mode];
      const context = `${projectContext}\n\nRecent Chat History:\n${chatHistory}`;

      let aiResponseText = "";
      let structuredData = null;

      if (mode === ProfAdaMode.TOPIC_SUGGESTION) {
        // Structured JSON mode
        const jsonString = await generateAIContent(userMessage, context, {
          systemPrompt,
          temperature: 0.6,
          responseSchema: TopicSuggestionSchema
        });
        
        try {
          const parsed = JSON.parse(jsonString);
          aiResponseText = parsed.message;
          structuredData = parsed.proposedTopic;
        } catch (e) {
          logger.error('Failed to parse structured JSON from AI', e);
          aiResponseText = "I encountered an error structuring my response. Let's try again.";
        }
      } else {
        // Standard Text Mode
        aiResponseText = await generateAIContent(userMessage, context, {
          systemPrompt,
          temperature: mode === ProfAdaMode.DEFENSE_QUESTION_GENERATOR ? 0.3 : 0.6
        });
      }

      // Save AI Message as 'prof'
      const profMsg = await prisma.message.create({
        data: {
          conversationId,
          role: 'prof',
          content: aiResponseText,
          hasAudio: false,
          audioUrl: null,
        }
      });

      return {
        message: aiResponseText,
        studentMessage: studentMsg,
        profMessage: profMsg,
        structuredData
      };
    } catch (error) {
      logger.error('ChatService Error:', error);
      throw error;
    }
  }
}
