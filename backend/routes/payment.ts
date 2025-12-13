import express, { Request, Response } from 'express';
import path from 'path';

const router = express.Router();

// Serve payment redirect HTML
router.get('/payment-redirect.html', (req: Request, res: Response) => {
  // Send the HTML file
  res.sendFile(path.join(__dirname, '../public/payment-redirect.html'));
});

export default router;
