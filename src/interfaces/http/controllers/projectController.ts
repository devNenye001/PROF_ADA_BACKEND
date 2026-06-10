import { Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../config/logger';

export class ProjectController {
  static async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const projects = await prisma.project.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ success: true, data: projects });
    } catch (error) {
      logger.error('Error fetching projects:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
  }

  static async getProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const project = await prisma.project.findFirst({
        where: { id, userId, deletedAt: null }
      });
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }
      res.json({ success: true, data: project });
    } catch (error) {
      logger.error('Error fetching project:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
  }

  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { title, description } = req.body;
      
      if (!title) {
        res.status(400).json({ success: false, error: 'Title is required' });
        return;
      }

      const project = await prisma.project.create({
        data: {
          title,
          description,
          userId
        }
      });
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      logger.error('Error creating project:', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  }

  static async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const { title, description, status } = req.body;

      const project = await prisma.project.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const updatedProject = await prisma.project.update({
        where: { id },
        data: { title, description, status }
      });

      res.json({ success: true, data: updatedProject });
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  }

  static async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      
      const project = await prisma.project.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      await prisma.project.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  }
}
