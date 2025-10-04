import express from 'express';
import { AuthController } from '../controllers/authController';
import { validateSignup } from '../middleware/validation';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/signup
router.post('/signup', validateSignup, authController.signup);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/verify-email
router.post('/verify-email', authController.verifyEmail);

export default router;
