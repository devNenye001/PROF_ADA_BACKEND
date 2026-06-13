import { Request, Response } from 'express';
import { verifyGoogleToken } from '../../../infrastructure/auth/googleAuth';
import { 
  generateTokens, 
  generateMagicLinkToken, 
  verifyMagicLinkToken, 
  verifyRefreshToken 
} from '../../../utils/jwt';
import { prisma } from '../../../infrastructure/database/prisma';
import { sendMagicLinkEmail } from '../../../config/email';

export const googleLogin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: { message: 'idToken is required' } });
    }

    const payload = await verifyGoogleToken(idToken);
    if (!payload) {
      return res.status(401).json({ success: false, error: { message: 'Invalid Google token' } });
    }

    const { email, name, picture, sub: googleId } = payload;
    
    if (!email || !name || !googleId) {
      return res.status(400).json({ success: false, error: { message: 'Incomplete Google profile data' } });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: { email, name, profileUrl: picture, googleId },
      });
    } else if (!user.googleId) {
      // Sync Google ID if email-only user later logs in with Google
      user = await prisma.user.update({
        where: { email },
        data: { googleId, profileUrl: picture },
      });
    }

    const tokens = generateTokens(user.id);
    
    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });
    
    res.status(200).json({ success: true, data: { user, ...tokens } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
  }
};

export const googleLoginRedirect = async (req: Request, res: Response): Promise<any> => {
  try {
    const { credential } = req.body;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!credential) {
      return res.redirect(`${FRONTEND_URL}/?error=Missing_Credential`);
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return res.redirect(`${FRONTEND_URL}/?error=Invalid_Token`);
    }

    const { email, name, picture, sub: googleId } = payload;
    
    if (!email || !name || !googleId) {
      return res.redirect(`${FRONTEND_URL}/?error=Incomplete_Profile`);
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: { email, name, profileUrl: picture, googleId },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId, profileUrl: picture },
      });
    }

    const tokens = generateTokens(user.id);
    
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });
    
    return res.redirect(`${FRONTEND_URL}/?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error(error);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${FRONTEND_URL}/?error=Server_Error`);
  }
};

export const requestMagicLink = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Email is required' } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid email format' } });
    }

    const token = generateMagicLinkToken(email);
    await sendMagicLinkEmail(email, token);

    res.status(200).json({ success: true, message: 'Magic link successfully sent' });
  } catch (error) {
    console.error('Magic link request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to send magic link' } });
  }
};

export const verifyMagicLink = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Verification token is required' } });
    }

    const decoded = verifyMagicLinkToken(token);
    if (!decoded || !decoded.email) {
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired verification token' } });
    }

    let user = await prisma.user.findUnique({ where: { email: decoded.email } });

    if (!user) {
      // Create a default name from the email prefix
      const defaultName = decoded.email.split('@')[0];
      user = await prisma.user.create({
        data: {
          email: decoded.email,
          name: defaultName,
        }
      });
    }

    const tokens = generateTokens(user.id);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    });
  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ success: false, error: { message: 'Internal Server Error during verification' } });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Refresh token is required' } });
    }

    // Support offline mock token rotation in development
    if (refreshToken.startsWith('mock_google_refresh_token_')) {
      const mockAccessToken = 'mock_google_access_token_' + Date.now();
      const mockRefreshToken = 'mock_google_refresh_token_' + Date.now();
      return res.status(200).json({
        success: true,
        data: {
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        }
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired refresh token signature' } });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Clean up token if it exists in DB but is expired
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
      }
      return res.status(401).json({ success: false, error: { message: 'Refresh token is expired or revoked' } });
    }

    // Single-use token rotation: Delete the used token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    // Generate new access and refresh tokens
    const tokens = generateTokens(storedToken.userId);

    // Save new refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to refresh access token' } });
  }
};
