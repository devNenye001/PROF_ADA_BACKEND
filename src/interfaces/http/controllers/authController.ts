import { Request, Response } from 'express';
import { verifyGoogleToken } from '../../../infrastructure/auth/googleAuth';
import { generateTokens } from '../../../utils/jwt';
import { prisma } from '../../../infrastructure/database/prisma';

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
        data: { email, name, picture, googleId },
      });
    }

    const tokens = generateTokens(user.id);
    
    res.status(200).json({ success: true, data: { user, ...tokens } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
  }
};
