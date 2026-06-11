import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../config/logger';

export const extractTextFromBuffer = async (buffer: Buffer, originalname: string): Promise<string> => {
  const extension = originalname.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'pdf': {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text || '';
      }
      
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      }

      case 'txt': {
        return buffer.toString('utf-8');
      }

      default:
        logger.warn(`Unsupported file format for extraction: ${extension}. Returning empty string.`);
        return '';
    }
  } catch (error) {
    logger.error(`Error extracting text from ${originalname}:`, error);
    throw new Error(`Failed to parse document content: ${originalname}`);
  }
};
