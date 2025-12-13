import express, { Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { validateSignup } from '../middleware/validation';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/signup
router.post('/signup', validateSignup, authController.signup);

// POST /api/auth/signup/initiate
router.post('/signup/initiate', validateSignup, (req: Request, res: Response) =>
  authController.initiateSignup(req, res)
);

// POST /api/auth/signup/complete
router.post('/signup/complete', (req: Request, res: Response) =>
  authController.completeSignup(req, res)
);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/verify-email
router.post('/verify-email', authController.verifyEmail);

// Forgot Password via SMS OTP
router.post('/forgot-password/init', authController.forgotPasswordInit);
router.post('/forgot-password/verify', authController.forgotPasswordVerify);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

export default router;
