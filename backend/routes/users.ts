import express from 'express';
import {
  getUserPreferences,
  updateUserPreferences,
  getSavedJobs,
  getNotifications,
  markNotificationAsRead,
  getUserProfile,
  updateUserProfile,
  getLanguages,
  getSkills,
  getIndustries,
  getUserLocation,
} from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.get('/getPreferences', authMiddleware, getUserPreferences);
router.put('/preferences', authMiddleware, updateUserPreferences);
router.get('/saved-jobs', authMiddleware, getSavedJobs);
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:id/read', authMiddleware, markNotificationAsRead);
router.get('/getProfile', authMiddleware, getUserProfile);
router.put('/updateProfile', authMiddleware, updateUserProfile);
router.get('/getIndustries', authMiddleware, getIndustries);
router.get('/getSkills', authMiddleware, getSkills);
router.get('/getLanguages', authMiddleware, getLanguages);
router.get('/location', authMiddleware, getUserLocation);

export default router;
