import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';
import { supabase } from '../../../utils/supabase';

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

    // Verify token directly with Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser || !supabaseUser.email) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized: Invalid Supabase token' } });
    }

    // Sync with local Prisma database so we have the internal user ID
    let user = await prisma.user.findUnique({ where: { email: supabaseUser.email } });
    
    if (!user) {
      // Auto-create user if they don't exist locally
      user = await prisma.user.create({ 
        data: { 
          email: supabaseUser.email, 
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
          profileUrl: supabaseUser.user_metadata?.avatar_url || null
        } 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ success: false, error: { message: 'Unauthorized: Invalid token' } });
  }
};
