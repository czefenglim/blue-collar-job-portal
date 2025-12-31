import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Serve payment redirect HTML
router.get('/payment-redirect.html', (req: Request, res: Response) => {
  // Try to find the file in different locations (dev vs prod)
  let filePath = path.join(__dirname, '../public/payment-redirect.html');
  
  if (!fs.existsSync(filePath)) {
    // Try production path (dist/routes/../../public)
    filePath = path.join(__dirname, '../../public/payment-redirect.html');
  }

  // Send the HTML file
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Payment redirect file not found');
  }
});

export default router;
