import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';

export class ContactController {
  static async submitContact(req: Request, res: Response): Promise<any> {
    try {
      const { name, email, category, message } = req.body;

      if (!name || !email || !category || !message) {
        return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
      }

      const contact = await prisma.contactMessage.create({
        data: {
          name,
          email,
          category,
          message,
          status: 'OPEN',
        },
      });

      return res.status(201).json({ success: true, data: contact });
    } catch (error: any) {
      console.error('Submit contact error:', error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}
