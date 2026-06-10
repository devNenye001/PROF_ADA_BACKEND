"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const logger_1 = require("../../../config/logger");
class ProjectController {
    static async getProjects(req, res) {
        try {
            const userId = req.user.id;
            const projects = await prisma_1.prisma.project.findMany({
                where: { userId, deletedAt: null },
                orderBy: { updatedAt: 'desc' }
            });
            res.json({ success: true, data: projects });
        }
        catch (error) {
            logger_1.logger.error('Error fetching projects:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch projects' });
        }
    }
    static async getProject(req, res) {
        try {
            const userId = req.user.id;
            const id = req.params.id;
            const project = await prisma_1.prisma.project.findFirst({
                where: { id, userId, deletedAt: null }
            });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            res.json({ success: true, data: project });
        }
        catch (error) {
            logger_1.logger.error('Error fetching project:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch project' });
        }
    }
    static async createProject(req, res) {
        try {
            const userId = req.user.id;
            const { title, description } = req.body;
            if (!title) {
                res.status(400).json({ success: false, error: 'Title is required' });
                return;
            }
            const project = await prisma_1.prisma.project.create({
                data: {
                    title,
                    description,
                    userId
                }
            });
            res.status(201).json({ success: true, data: project });
        }
        catch (error) {
            logger_1.logger.error('Error creating project:', error);
            res.status(500).json({ success: false, error: 'Failed to create project' });
        }
    }
    static async updateProject(req, res) {
        try {
            const userId = req.user.id;
            const id = req.params.id;
            const { title, description, status } = req.body;
            const project = await prisma_1.prisma.project.findFirst({
                where: { id, userId, deletedAt: null }
            });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            const updatedProject = await prisma_1.prisma.project.update({
                where: { id },
                data: { title, description, status }
            });
            res.json({ success: true, data: updatedProject });
        }
        catch (error) {
            logger_1.logger.error('Error updating project:', error);
            res.status(500).json({ success: false, error: 'Failed to update project' });
        }
    }
    static async deleteProject(req, res) {
        try {
            const userId = req.user.id;
            const id = req.params.id;
            const project = await prisma_1.prisma.project.findFirst({
                where: { id, userId, deletedAt: null }
            });
            if (!project) {
                res.status(404).json({ success: false, error: 'Project not found' });
                return;
            }
            await prisma_1.prisma.project.update({
                where: { id },
                data: { deletedAt: new Date() }
            });
            res.json({ success: true, message: 'Project deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting project:', error);
            res.status(500).json({ success: false, error: 'Failed to delete project' });
        }
    }
}
exports.ProjectController = ProjectController;
