import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';

export class FeedbackController {
  static async submitFeedback(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      }

      const { featureType, rating, reason, message, device, theme, version } = req.body;

      if (!featureType || !rating) {
        return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
      }

      const feedback = await prisma.userFeedback.create({
        data: {
          userId: user.id,
          featureType,
          rating,
          reason,
          message,
          device,
          theme,
          version,
        },
      });

      return res.status(201).json({ success: true, data: feedback });
    } catch (error: any) {
      console.error('Submit feedback error:', error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}
