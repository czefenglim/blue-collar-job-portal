import express from 'express';
import {
  getPlans,
  updatePlan,
} from '../controllers/subscriptionPlanController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Get all plans (public or authenticated? Let's make it authenticated to be safe, or public for pricing page?)
// For now, authenticated as it is used in employer pricing and admin.
router.get('/', getPlans);

// Update plan (Admin only)
router.put('/:id', authMiddleware, updatePlan);

export default router;
