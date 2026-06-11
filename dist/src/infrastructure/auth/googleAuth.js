"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = void 0;
const google_auth_library_1 = require("google-auth-library");
const logger_1 = require("../../config/logger");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    }
    catch (error) {
        logger_1.logger.error('Error verifying Google Token:', error);
        return undefined;
    }
};
exports.verifyGoogleToken = verifyGoogleToken;
