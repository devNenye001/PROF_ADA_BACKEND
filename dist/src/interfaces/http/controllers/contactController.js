"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const prisma_1 = require("../../../infrastructure/database/prisma");
class ContactController {
    static async submitContact(req, res) {
        try {
            const { name, email, category, message } = req.body;
            if (!name || !email || !category || !message) {
                return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
            }
            const contact = await prisma_1.prisma.contactMessage.create({
                data: {
                    name,
                    email,
                    category,
                    message,
                    status: 'OPEN',
                },
            });
            return res.status(201).json({ success: true, data: contact });
        }
        catch (error) {
            console.error('Submit contact error:', error);
            return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
        }
    }
}
exports.ContactController = ContactController;
