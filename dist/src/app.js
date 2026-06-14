"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const projectRoutes_1 = __importDefault(require("./interfaces/http/routes/projectRoutes"));
const chatRoutes_1 = __importDefault(require("./interfaces/http/routes/chatRoutes"));
const reviewRoutes_1 = __importDefault(require("./interfaces/http/routes/reviewRoutes"));
const logger_1 = require("./config/logger");
const app = (0, express_1.default)();
const allowedOrigins = [
    'https://prof-adang.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/projects', projectRoutes_1.default);
app.use('/api', chatRoutes_1.default); // contains /projects/:id/conversations & /conversations/:id/chat
app.use('/api', reviewRoutes_1.default); // contains /projects/:id/documents/upload & /documents/:id/review
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Prof. Ada backend is running smoothly' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});
exports.default = app;
