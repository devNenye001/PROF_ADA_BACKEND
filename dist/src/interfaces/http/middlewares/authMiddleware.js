"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../../../utils/jwt");
const prisma_1 = require("../../../infrastructure/database/prisma");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized: Missing token' } });
        }
        const token = authHeader.split(' ')[1];
        // Support mock Google login for development/demo configurations
        if (token.startsWith('mock_google_access_token_')) {
            let user = await prisma_1.prisma.user.findUnique({ where: { email: 'student@university.edu' } });
            if (!user) {
                user = await prisma_1.prisma.user.create({
                    data: {
                        email: 'student@university.edu',
                        name: 'Mock Student',
                    }
                });
            }
            req.user = user;
            return next();
        }
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized: User not found' } });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized: Invalid token' } });
    }
};
exports.authMiddleware = authMiddleware;
