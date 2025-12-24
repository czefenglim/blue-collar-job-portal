import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import {
  createOffer,
  getOffer,
  respondToOffer,
  verifyHire,
} from '../controllers/hireController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/offer', authMiddleware, upload.single('contract'), createOffer);
router.get('/offer/:applicationId', authMiddleware, getOffer);
router.post(
  '/respond',
  authMiddleware,
  upload.fields([{ name: 'signedContract', maxCount: 1 }]),
  respondToOffer
);

router.post('/verify', authMiddleware, verifyHire);

export default router;
