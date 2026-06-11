import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../../utils/jwt';
import { prisma } from '../../../infrastructure/database/prisma';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized: Missing token' } });
    }

    const token = authHeader.split(' ')[1];

    // Support mock Google login for development/demo configurations
    if (token.startsWith('mock_google_access_token_')) {
      let user = await prisma.user.findUnique({ where: { email: 'student@university.edu' } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'student@university.edu',
            name: 'Mock Student',
          }
        });
      }
      req.user = user;
      return next();
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized: User not found' } });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized: Invalid token' } });
  }
};
