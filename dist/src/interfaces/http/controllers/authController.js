"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAccessToken = exports.verifyMagicLink = exports.requestMagicLink = exports.googleLogin = void 0;
const googleAuth_1 = require("../../../infrastructure/auth/googleAuth");
const jwt_1 = require("../../../utils/jwt");
const prisma_1 = require("../../../infrastructure/database/prisma");
const email_1 = require("../../../config/email");
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
                data: { email, name, profileUrl: picture, googleId },
            });
        }
        else if (!user.googleId) {
            // Sync Google ID if email-only user later logs in with Google
            user = await prisma_1.prisma.user.update({
                where: { email },
                data: { googleId, profileUrl: picture },
            });
        }
        const tokens = (0, jwt_1.generateTokens)(user.id);
        // Save refresh token
        await prisma_1.prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });
        res.status(200).json({ success: true, data: { user, ...tokens } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
};
exports.googleLogin = googleLogin;
const requestMagicLink = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, error: { message: 'Email is required' } });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid email format' } });
        }
        const token = (0, jwt_1.generateMagicLinkToken)(email);
        await (0, email_1.sendMagicLinkEmail)(email, token);
        res.status(200).json({ success: true, message: 'Magic link successfully sent' });
    }
    catch (error) {
        console.error('Magic link request error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to send magic link' } });
    }
};
exports.requestMagicLink = requestMagicLink;
const verifyMagicLink = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, error: { message: 'Verification token is required' } });
        }
        const decoded = (0, jwt_1.verifyMagicLinkToken)(token);
        if (!decoded || !decoded.email) {
            return res.status(401).json({ success: false, error: { message: 'Invalid or expired verification token' } });
        }
        let user = await prisma_1.prisma.user.findUnique({ where: { email: decoded.email } });
        if (!user) {
            // Create a default name from the email prefix
            const defaultName = decoded.email.split('@')[0];
            user = await prisma_1.prisma.user.create({
                data: {
                    email: decoded.email,
                    name: defaultName,
                }
            });
        }
        const tokens = (0, jwt_1.generateTokens)(user.id);
        // Save refresh token
        await prisma_1.prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });
        res.status(200).json({
            success: true,
            data: {
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            }
        });
    }
    catch (error) {
        console.error('Magic link verification error:', error);
        res.status(500).json({ success: false, error: { message: 'Internal Server Error during verification' } });
    }
};
exports.verifyMagicLink = verifyMagicLink;
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken || typeof refreshToken !== 'string') {
            return res.status(400).json({ success: false, error: { message: 'Refresh token is required' } });
        }
        // Support offline mock token rotation in development
        if (refreshToken.startsWith('mock_google_refresh_token_')) {
            const mockAccessToken = 'mock_google_access_token_' + Date.now();
            const mockRefreshToken = 'mock_google_refresh_token_' + Date.now();
            return res.status(200).json({
                success: true,
                data: {
                    accessToken: mockAccessToken,
                    refreshToken: mockRefreshToken,
                }
            });
        }
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ success: false, error: { message: 'Invalid or expired refresh token signature' } });
        }
        const storedToken = await prisma_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken }
        });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            // Clean up token if it exists in DB but is expired
            if (storedToken) {
                await prisma_1.prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => { });
            }
            return res.status(401).json({ success: false, error: { message: 'Refresh token is expired or revoked' } });
        }
        // Single-use token rotation: Delete the used token
        await prisma_1.prisma.refreshToken.delete({ where: { token: refreshToken } });
        // Generate new access and refresh tokens
        const tokens = (0, jwt_1.generateTokens)(storedToken.userId);
        // Save new refresh token in DB
        await prisma_1.prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: storedToken.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });
        res.status(200).json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            }
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to refresh access token' } });
    }
};
exports.refreshAccessToken = refreshAccessToken;
