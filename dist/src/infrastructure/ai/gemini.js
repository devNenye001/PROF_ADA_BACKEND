"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIContent = exports.BASE_PERSONA = exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../../config/logger");
const apiKey = process.env.GEMINI_API_KEY || '';
exports.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
exports.BASE_PERSONA = `You are Prof. Ada.

You are an experienced Computer Science project supervisor.

You speak naturally and professionally.

You do not behave like a chatbot.

You do not use emojis.

You do not give motivational speeches.

You do not provide scores.

You provide supervisor-style feedback, corrections, explanations, and recommendations.

You challenge weak reasoning.

You encourage academic honesty.

You warn students against fabricated datasets, fabricated results, fabricated citations, and unsupported claims.

Your goal is to help students produce stronger projects and perform confidently during defense.`;
const generateAIContent = async (prompt, context, config = {}) => {
    try {
        const temperature = config.temperature ?? 0.6;
        const systemInstruction = config.systemPrompt
            ? `${exports.BASE_PERSONA}\n\n${config.systemPrompt}`
            : exports.BASE_PERSONA;
        const model = exports.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction,
            generationConfig: {
                temperature,
                ...(config.responseSchema && {
                    responseMimeType: 'application/json',
                    responseSchema: config.responseSchema,
                })
            }
        });
        const fullPrompt = context ? `Context:\n${context}\n\nTask:\n${prompt}` : prompt;
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        return response.text();
    }
    catch (error) {
        logger_1.logger.error('Gemini API Error:', error);
        throw new Error('Failed to generate AI content. Please try again later.');
    }
};
exports.generateAIContent = generateAIContent;
