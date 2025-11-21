// src/middleware/adminAuth.middleware.ts

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminAuthRequest } from '../types/admin';

interface AdminTokenPayload {
  adminId: string;
  adminEmail: string;
  isAdmin: boolean;
  role?: string; // Added optional role for backward compatibility
}

export const adminAuthMiddleware = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT secret not configured.',
      });
    }

    console.log('JWT_SECRET used:', process.env.JWT_SECRET);

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AdminTokenPayload;

    // Check if token is for admin
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }

    // Verify admin credentials match environment variables
    if (
      decoded.adminEmail !== process.env.ADMIN_EMAIL ||
      decoded.adminId !== process.env.ADMIN_EMAIL // Using email as ID for simplicity
    ) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    // Attach admin info to request
    req.adminId = decoded.adminId;
    req.adminEmail = decoded.adminEmail;
    if (decoded.role) {
      req.adminRole = decoded.role; // Attach role if present
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
    }

    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};
