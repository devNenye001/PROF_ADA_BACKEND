"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLinkEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("./logger");
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});
const sendMagicLinkEmail = async (email, token) => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify?token=${token}`;
    const mailOptions = {
        from: `"Prof. Ada" <${process.env.SMTP_FROM || 'noreply@gouniversity.edu.ng'}>`,
        to: email,
        subject: 'Your Magic Login Link for Prof. Ada',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; rounded: 12px;">
        <h2 style="color: #ea580c;">Welcome to Prof. Ada</h2>
        <p>You requested a magic link to sign in to your academic supervisor workspace.</p>
        <p>Please click the button below to log in. This link is valid for 15 minutes.</p>
        <div style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Sign In to Prof. Ada
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you did not request this link, you can safely ignore this email.</p>
      </div>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        logger_1.logger.info(`Magic link email sent to ${email}. Message ID: ${info.messageId}`);
    }
    catch (error) {
        logger_1.logger.error('Error sending magic link email:', error);
        throw new Error('Failed to send magic link email');
    }
};
exports.sendMagicLinkEmail = sendMagicLinkEmail;
