"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
class FeedbackController {
    static async submitFeedback(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            }
            const { featureType, rating, reason, message, device, theme, version } = req.body;
            if (!featureType || !rating) {
                return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
            }
            const feedback = await prisma_1.prisma.userFeedback.create({
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
        }
        catch (error) {
            console.error('Submit feedback error:', error);
            return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
        }
    }
}
exports.FeedbackController = FeedbackController;
