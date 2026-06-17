"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
const supabase_1 = require("../../../utils/supabase");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized: Missing token' } });
        }
        const token = authHeader.split(' ')[1];
        // Verify token directly with Supabase
        const { data: { user: supabaseUser }, error } = await supabase_1.supabase.auth.getUser(token);
        console.log("Supabase getUser error:", error);
        if (supabaseUser)
            console.log("TOKEN_VERIFIED for:", supabaseUser.email);
        if (error || !supabaseUser || !supabaseUser.email) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized: Invalid Supabase token', details: error } });
        }
        console.log("USER_FOUND in Supabase:", supabaseUser.email);
        console.log("SESSION_VALID");
        // Sync with local Prisma database so we have the internal user ID
        let user = await prisma_1.prisma.user.findUnique({ where: { email: supabaseUser.email } });
        if (!user) {
            // Auto-create user if they don't exist locally
            user = await prisma_1.prisma.user.create({
                data: {
                    email: supabaseUser.email,
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                    profileUrl: supabaseUser.user_metadata?.avatar_url || null
                }
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ success: false, error: { message: 'Internal Server Error during authentication' } });
    }
};
exports.authMiddleware = authMiddleware;
