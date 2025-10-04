import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Extract token from the Authorization header (format: "Bearer <token>")
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // 2. Verify the token using your secret key
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: number;
      email: string;
    };

    // 3. Attach decoded user info to the request object
    // (extend Express.Request type to allow custom fields like `user`)
    (req as Request & { user?: typeof decoded }).user = decoded;

    // 4. Allow the request to continue to the next middleware or controller
    next();
  } catch {
    // 5. If verification fails, block the request
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default authMiddleware;
