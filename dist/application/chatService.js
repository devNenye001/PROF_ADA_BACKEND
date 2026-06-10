"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const gemini_1 = require("../infrastructure/ai/gemini");
const prisma_1 = require("../infrastructure/database/prisma");
const aiModes_1 = require("./aiModes");
const logger_1 = require("../config/logger");
class ChatService {
    static async getConversationContext(projectId, conversationId) {
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                user: true,
            }
        });
        const recentMessages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        // Reverse to chronological order
        const chatHistory = recentMessages.reverse().map(m => `${m.sender}: ${m.content}`).join('\n');
        const projectContext = `Project Title: ${project?.title || 'Unknown'}
Student Department: ${project?.user?.department || 'Unknown'}
Project Status: ${project?.status || 'Unknown'}`;
        return { projectContext, chatHistory };
    }
    static async processMessage(projectId, conversationId, userMessage, mode = aiModes_1.ProfAdaMode.RESEARCH_GAP_REVIEW) {
        try {
            const { projectContext, chatHistory } = await this.getConversationContext(projectId, conversationId);
            // Save User Message
            await prisma_1.prisma.message.create({
                data: {
                    conversationId,
                    sender: 'USER',
                    content: userMessage,
                }
            });
            const systemPrompt = aiModes_1.ModeSystemPrompts[mode];
            const context = `${projectContext}\n\nRecent Chat History:\n${chatHistory}`;
            let aiResponseText = "";
            let structuredData = null;
            if (mode === aiModes_1.ProfAdaMode.TOPIC_SUGGESTION) {
                // Structured JSON mode
                const jsonString = await (0, gemini_1.generateAIContent)(userMessage, context, {
                    systemPrompt,
                    temperature: 0.6,
                    responseSchema: aiModes_1.TopicSuggestionSchema
                });
                try {
                    const parsed = JSON.parse(jsonString);
                    aiResponseText = parsed.message;
                    structuredData = parsed.proposedTopic;
                }
                catch (e) {
                    logger_1.logger.error('Failed to parse structured JSON from AI', e);
                    aiResponseText = "I encountered an error structuring my response. Let's try again.";
                }
            }
            else {
                // Standard Text Mode
                aiResponseText = await (0, gemini_1.generateAIContent)(userMessage, context, {
                    systemPrompt,
                    temperature: mode === aiModes_1.ProfAdaMode.DEFENSE_QUESTION_GENERATOR ? 0.3 : 0.6
                });
            }
            // Save AI Message
            await prisma_1.prisma.message.create({
                data: {
                    conversationId,
                    sender: 'AI',
                    content: aiResponseText,
                }
            });
            // If Topic Discovery yielded a proposed topic, we can optionally save it
            if (structuredData && structuredData.title) {
                // Auto-save topic suggestion logic here if needed
            }
            return {
                message: aiResponseText,
                structuredData
            };
        }
        catch (error) {
            logger_1.logger.error('ChatService Error:', error);
            throw error;
        }
    }
}
exports.ChatService = ChatService;
