import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { logger } from '../../config/logger';

const apiKey = process.env.GEMINI_API_KEY || '';
export const genAI = new GoogleGenerativeAI(apiKey);

export const BASE_PERSONA = `You are Prof. Ada.

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

export interface AIRequestConfig {
  systemPrompt?: string;
  temperature?: number;
  responseSchema?: Schema;
}

export const generateAIContent = async (
  prompt: string,
  context: string,
  config: AIRequestConfig = {}
): Promise<string> => {
  try {
    const temperature = config.temperature ?? 0.6;
    const systemInstruction = config.systemPrompt 
      ? `${BASE_PERSONA}\n\n${config.systemPrompt}` 
      : BASE_PERSONA;

    const model = genAI.getGenerativeModel({ 
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
  } catch (error) {
    logger.error('Gemini API Error:', error);
    throw new Error('Failed to generate AI content. Please try again later.');
  }
};
