import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Serve payment redirect HTML
router.get('/payment-redirect.html', (req: Request, res: Response) => {
  // Try to find the file in different locations (dev vs prod)
  const possiblePaths = [
    path.join(__dirname, '../public/payment-redirect.html'),
    path.join(__dirname, '../../public/payment-redirect.html'),
    path.join(process.cwd(), 'backend/public/payment-redirect.html'),
    path.join(process.cwd(), 'public/payment-redirect.html'),
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  // Send the HTML file
  if (filePath) {
    res.sendFile(filePath);
  } else {
    console.error(
      'Payment redirect file not found. Searched in:',
      possiblePaths
    );
    res.status(404).send('Payment redirect file not found');
  }
});

export default router;
