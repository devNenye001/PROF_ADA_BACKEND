import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export const sendMagicLinkEmail = async (email: string, token: string): Promise<void> => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify?token=${token}`;
  
  // Log the magic link to the console for easy local development access
  logger.info(`\n==================================================\n[MAGIC LINK] Verification URL for ${email}:\n${verifyUrl}\n==================================================\n`);
  
  const isSmtpConfigured = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  
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
    if (isSmtpConfigured || process.env.NODE_ENV === 'production') {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Magic link email sent to ${email}. Message ID: ${info.messageId}`);
    } else {
      logger.info(`SMTP credentials not fully configured. Bypassing email transmission in development.`);
    }
  } catch (error) {
    logger.error('Error sending magic link email:', error);
    // In local development, don't crash the API response if SMTP fails
    if (process.env.NODE_ENV !== 'production') {
      logger.info('SMTP transmission failed, but continuing in development mode. Use the link printed above.');
      return;
    }
    throw new Error('Failed to send magic link email');
  }
};
