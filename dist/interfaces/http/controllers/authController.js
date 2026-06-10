"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = void 0;
const googleAuth_1 = require("../../../infrastructure/auth/googleAuth");
const jwt_1 = require("../../../utils/jwt");
const prisma_1 = require("../../../infrastructure/database/prisma");
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ success: false, error: { message: 'idToken is required' } });
        }
        const payload = await (0, googleAuth_1.verifyGoogleToken)(idToken);
        if (!payload) {
            return res.status(401).json({ success: false, error: { message: 'Invalid Google token' } });
        }
        const { email, name, picture, sub: googleId } = payload;
        if (!email || !name || !googleId) {
            return res.status(400).json({ success: false, error: { message: 'Incomplete Google profile data' } });
        }
        let user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: { email, name, picture, googleId },
            });
        }
        const tokens = (0, jwt_1.generateTokens)(user.id);
        res.status(200).json({ success: true, data: { user, ...tokens } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
};
exports.googleLogin = googleLogin;
