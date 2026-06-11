"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const prisma_1 = require("../src/infrastructure/database/prisma");
const jwt_1 = require("../src/utils/jwt");
describe('Chat API (User-Scoped Multi-Chat)', () => {
    let userA;
    let userB;
    let tokenA;
    let tokenB;
    let conversationId;
    beforeAll(async () => {
        // Create unique test users
        userA = await prisma_1.prisma.user.create({
            data: {
                googleId: `test-google-a-${Date.now()}`,
                email: `student-a-${Date.now()}@test.edu`,
                name: 'Test Student A',
                department: 'Computer Science',
            },
        });
        userB = await prisma_1.prisma.user.create({
            data: {
                googleId: `test-google-b-${Date.now()}`,
                email: `student-b-${Date.now()}@test.edu`,
                name: 'Test Student B',
                department: 'Cybersecurity',
            },
        });
        tokenA = (0, jwt_1.generateTokens)(userA.id).accessToken;
        tokenB = (0, jwt_1.generateTokens)(userB.id).accessToken;
    });
    afterAll(async () => {
        // Cleanup users (this will cascade delete conversations & messages)
        await prisma_1.prisma.user.deleteMany({
            where: {
                id: { in: [userA.id, userB.id] },
            },
        });
        await prisma_1.prisma.$disconnect();
    });
    describe('POST /api/conversations', () => {
        it('should fail if unauthorized', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/conversations')
                .send({ title: 'New Chat' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
        it('should create a new empty conversation for the authenticated user', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ title: 'My Research Project' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.title).toBe('My Research Project');
            expect(res.body.data.userId).toBe(userA.id);
            conversationId = res.body.data.id;
        });
        it('should default the title if not provided', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({});
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe('New Conversation');
        });
    });
    describe('GET /api/conversations', () => {
        it('should retrieve conversations only belonging to the authenticated user', async () => {
            // Create one for User B
            await (0, supertest_1.default)(app_1.default)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${tokenB}`)
                .send({ title: 'User B Chat' });
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            // Should see User A's conversations but not User B's
            const titles = res.body.data.map((c) => c.title);
            expect(titles).toContain('My Research Project');
            expect(titles).toContain('New Conversation');
            expect(titles).not.toContain('User B Chat');
        });
    });
    describe('GET /api/conversations/:id', () => {
        it('should retrieve a specific conversation with empty messages list', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(conversationId);
            expect(res.body.data.messages).toEqual([]);
        });
        it('should prevent user B from retrieving user A\'s conversation', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenB}`);
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });
    describe('PATCH /api/conversations/:id', () => {
        it('should update the conversation title', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ title: 'Updated Title' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe('Updated Title');
        });
        it('should prevent User B from updating User A\'s conversation title', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .send({ title: 'Hacked Title' });
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });
    describe('POST /api/conversations/:id/messages', () => {
        it('should append user message and trigger professor AI response', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/conversations/${conversationId}/messages`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                content: 'Hello Prof. Ada, can you explain what a research gap is?',
                mode: 'RESEARCH_GAP_REVIEW'
            });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.studentMessage).toBeDefined();
            expect(res.body.data.studentMessage.role).toBe('student');
            expect(res.body.data.studentMessage.content).toBe('Hello Prof. Ada, can you explain what a research gap is?');
            expect(res.body.data.profMessage).toBeDefined();
            expect(res.body.data.profMessage.role).toBe('prof');
            expect(res.body.data.profMessage.content).toBeDefined();
            expect(res.body.data.profMessage.hasAudio).toBe(false);
        });
        it('should prevent User B from adding messages to User A\'s conversation', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/conversations/${conversationId}/messages`)
                .set('Authorization', `Bearer ${tokenB}`)
                .send({ content: 'Unauthorised message' });
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });
    describe('DELETE /api/conversations/:id', () => {
        it('should prevent User B from deleting User A\'s conversation', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenB}`);
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
        it('should successfully delete User A\'s conversation and cascade delete its messages', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // Verify it cannot be retrieved anymore
            const checkRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${tokenA}`);
            expect(checkRes.status).toBe(404);
            // Verify messages are deleted from the database
            const messages = await prisma_1.prisma.message.findMany({
                where: { conversationId }
            });
            expect(messages.length).toBe(0);
        });
    });
});
