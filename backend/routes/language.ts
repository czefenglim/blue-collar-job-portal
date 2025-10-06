import express from 'express';
import { updatePreferredLanguage } from '../controllers/languageController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Route to update preferred language
router.put('/updateLanguage', updatePreferredLanguage);

export default router;
