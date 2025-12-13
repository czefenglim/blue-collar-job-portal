import express from 'express';
import { handleChat } from '../controllers/aiAssistantController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.post('/chat', handleChat);

export default router;
