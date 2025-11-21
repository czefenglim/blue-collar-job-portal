import express from 'express';
import {
  getAllCompanies,
  getCompanyById,
} from '../controllers/companyController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Public/Authenticated routes
router.get('/', authMiddleware, getAllCompanies);
router.get('/:id', authMiddleware, getCompanyById);

export default router;
