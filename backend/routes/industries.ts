import express from 'express';
import { getIndustries } from '../controllers/industryController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getIndustries);

export default router;
