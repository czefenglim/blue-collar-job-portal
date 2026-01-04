import express from 'express';
import {
  getCurrentSubscription,
  selectFreePlan,
  createCheckoutSession,
  verifyPayment,
  handleStripeWebhook,
  cancelSubscription,
  canPostJob,
} from '../controllers/subscriptionController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Get current subscription
router.get('/current', authMiddleware, getCurrentSubscription);

// Select free plan
router.post('/select-free', authMiddleware, selectFreePlan);

// Create checkout session for paid plans
router.post('/create-checkout', authMiddleware, createCheckoutSession);

// Verify payment after checkout
router.get('/verify-payment', authMiddleware, verifyPayment);
// Cancel subscription
router.post('/cancel', authMiddleware, cancelSubscription);

// Check if can post job
router.get('/can-post-job', authMiddleware, canPostJob);

// Stripe webhook (NO auth middleware - Stripe validates with signature)
// NOTE: This route is handled in server.ts directly to ensure raw body parsing
// router.post('/webhook', handleStripeWebhook);
export default router;
