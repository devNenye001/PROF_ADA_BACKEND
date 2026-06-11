"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromBuffer = void 0;
const pdf_parse_1 = require("pdf-parse");
const mammoth_1 = __importDefault(require("mammoth"));
const logger_1 = require("../config/logger");
const extractTextFromBuffer = async (buffer, originalname) => {
    const extension = originalname.split('.').pop()?.toLowerCase();
    try {
        switch (extension) {
            case 'pdf': {
                const parser = new pdf_parse_1.PDFParse({ data: buffer });
                const result = await parser.getText();
                await parser.destroy();
                return result.text || '';
            }
            case 'docx': {
                const result = await mammoth_1.default.extractRawText({ buffer });
                return result.value || '';
            }
            case 'txt': {
                return buffer.toString('utf-8');
            }
            default:
                logger_1.logger.warn(`Unsupported file format for extraction: ${extension}. Returning empty string.`);
                return '';
        }
    }
    catch (error) {
        logger_1.logger.error(`Error extracting text from ${originalname}:`, error);
        throw new Error(`Failed to parse document content: ${originalname}`);
    }
};
exports.extractTextFromBuffer = extractTextFromBuffer;
