"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentReviewRateLimiter = exports.chatRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.chatRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 chat requests per `window` (here, per hour)
    message: {
        success: false,
        error: { message: 'Too many chat requests created from this IP, please try again after an hour' }
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.documentReviewRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // Limit each IP to 5 document reviews per `window` (here, per day)
    message: {
        success: false,
        error: { message: 'Daily limit of 5 document reviews exceeded, please try again tomorrow' }
    },
    standardHeaders: true,
    legacyHeaders: false,
});
