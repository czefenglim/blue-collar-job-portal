// In onboardingRoutes.ts - UPDATE THIS:
import express from 'express';
import { OnboardingController } from '../controllers/onboardingController';
import authMiddleware from '../middleware/authMiddleware';
import { getResumeSignedUrl } from '../services/s3Service';

const router = express.Router();
const onboardingController = new OnboardingController();

// GET /api/industries
router.get('/industries', onboardingController.getIndustries);

// Save User Profile
router.post(
  '/saveUserProfile',
  authMiddleware,
  onboardingController.saveUserProfile // No .bind()
);

// Save User Industries
router.post(
  '/saveUserIndustries',
  authMiddleware,
  onboardingController.saveUserIndustries // No .bind()
);

// Save Resume Answers
router.post(
  '/saveResumeAnswers',
  authMiddleware,
  onboardingController.saveResumeAnswers // No .bind()
);

router.get(
  '/getResumeQuestions',
  onboardingController.getResumeQuestions // No .bind()
);

router.get(
  '/getSkills',
  onboardingController.getSkills // No .bind()
);

router.get(
  '/getLanguages',
  onboardingController.getLanguages // No .bind()
);

router.post(
  '/generateResume',
  authMiddleware,
  onboardingController.generateResume // No .bind()
);

// router.get('/resume/:key(*)', async (req, res) => {
//   try {
//     const key = (req.params as any)[0]; // 👈 tell TS it's allowed
//     if (!key) {
//       return res.status(400).json({ error: 'Missing resume key' });
//     }

//     const url = await getResumeSignedUrl(key);
//     res.json({ resumeUrl: url });
//   } catch (err) {
//     console.error('Signed URL error:', err);
//     res.status(500).json({ error: 'Failed to get signed URL' });
//   }
// });

router.get('/resume/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const url = await getResumeSignedUrl(key);
    res.json({ resumeUrl: url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get signed URL' });
  }
});
export default router;
