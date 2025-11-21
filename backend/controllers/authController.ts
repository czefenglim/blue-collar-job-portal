import { PrismaClient, UserRole } from '@prisma/client';

import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { SignupRequest } from '../types/signUpRequest';

const prisma = new PrismaClient();

interface LoginRequest {
  email: string;
  password: string;
}

export class AuthController {
  // User Signup
  async signup(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { fullName, email, phoneNumber, password, role }: SignupRequest =
        req.body;

      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Missing user role (e.g., EMPLOYER or USER)',
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          fullName,
          phoneNumber,
          role,
          profile: {
            create: {
              profileCompleted: false,
            },
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          profile: {
            select: {
              profileCompleted: true,
            },
          },
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user,
          token,
          isNewUser: true,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during signup',
      });
    }
  }

  // User Login
  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password }: LoginRequest = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          fullName: true,
          phoneNumber: true,
          isEmailVerified: true,
          isActive: true,
          createdAt: true,
          profile: {
            select: {
              profileCompleted: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' }
      );

      // Exclude password
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
          isNewUser: false,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
      });
    }
  }

  // Email Verification
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as any;

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: { isEmailVerified: true },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }
  }
}
