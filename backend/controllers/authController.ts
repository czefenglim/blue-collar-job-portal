import { PrismaClient, UserRole } from '@prisma/client';

import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { SignupRequest } from '../types/signUpRequest';

// Remove WhatsApp service and use email service
import { sendEmailOtp, sendRegistrationOtp } from '../services/emailService';

const prisma = new PrismaClient();

interface LoginRequest {
  email: string;
  password: string;
}

// ✅ Helper function to normalize Malaysian phone numbers
function normalizePhoneNumber(phone: string): string {
  // Remove all whitespace and special characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with '0', replace with '+60' (Malaysia country code)
  if (cleaned.startsWith('0')) {
    cleaned = '+60' + cleaned.substring(1);
  }

  // If doesn't start with '+', assume Malaysia and add '+60'
  if (!cleaned.startsWith('+')) {
    cleaned = '+60' + cleaned;
  }

  return cleaned;
}

export class AuthController {
  // Initiate Signup (Send OTP)
  async initiateSignup(req: Request, res: Response) {
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

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const hashedPassword = await bcrypt.hash(password, 12);

      // ✅ Normalize phone number before saving
      const normalizedPhone = phoneNumber
        ? normalizePhoneNumber(phoneNumber)
        : null;

      const registrationData = JSON.stringify({
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber: normalizedPhone,
        role,
      });

      // Upsert OTP
      await prisma.registrationOTP.upsert({
        where: { email: email.toLowerCase() },
        update: {
          otp,
          expiresAt,
          data: registrationData,
          createdAt: new Date(),
        },
        create: {
          email: email.toLowerCase(),
          otp,
          expiresAt,
          data: registrationData,
        },
      });

      // Send OTP
      await sendRegistrationOtp(email, otp);

      res.status(200).json({
        success: true,
        message: 'OTP sent to email',
      });
    } catch (error) {
      console.error('Initiate signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during signup initiation',
      });
    }
  }

  // Complete Signup (Verify OTP and Create User)
  async completeSignup(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required',
        });
      }

      const record = await prisma.registrationOTP.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!record) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired registration session',
        });
      }

      if (record.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP',
        });
      }

      if (new Date() > record.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP expired',
        });
      }

      const data = JSON.parse(record.data);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: data.password, // Already hashed
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          role: data.role,
          isEmailVerified: true, // ✅ Verified!
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

      // Delete OTP record
      await prisma.registrationOTP.delete({
        where: { email: email.toLowerCase() },
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
    } catch (error: any) {
      console.error('Complete signup error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'User already created',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error during signup completion',
      });
    }
  }

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

      // ✅ Normalize phone number before saving
      const normalizedPhone = phoneNumber
        ? normalizePhoneNumber(phoneNumber)
        : null;

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          fullName,
          phoneNumber: normalizedPhone,
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
          role: true,
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
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
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

  // =============================
  // Forgot Password via Email OTP
  // =============================
  async forgotPasswordInit(req: Request, res: Response) {
    try {
      const { email, preferredLanguage } = req.body as {
        email?: string;
        preferredLanguage?: string;
      };

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Find user by email
      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true, email: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Account not found with this email',
        });
      }

      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: 'Email not registered for this account',
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create OTP session token (for client to carry between requests)
      const otpSessionToken = jwt.sign(
        { userId: user.id, type: 'otp_session' },
        process.env.JWT_SECRET as string,
        { expiresIn: '10m' }
      );

      // Persist OTP in DB
      await prisma.passwordResetOTP.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
          otpSessionToken,
        },
      });

      console.log(`📤 Sending Email OTP to: ${user.email}`);
      console.log(`🔐 OTP code (for testing): ${otp}`);

      // Send via SMTP Email
      const result = await sendEmailOtp(user.email, otp, preferredLanguage);
      if (!result.success) {
        console.error('❌ Email send failed:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP via email',
          error: result.error,
        });
      }

      // Mask email
      const [local, domain] = user.email.split('@');
      const maskedLocal =
        local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}****`;
      const maskedEmail = `${maskedLocal}@${domain}`;

      return res.status(200).json({
        success: true,
        message: 'OTP sent via email',
        data: { otpSessionToken, maskedEmail },
      });
    } catch (error) {
      console.error('Forgot password init error:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  }

  async forgotPasswordVerify(req: Request, res: Response) {
    try {
      const { otp, otpSessionToken } = req.body as {
        otp?: string;
        otpSessionToken?: string;
      };

      if (!otp || !otpSessionToken) {
        return res.status(400).json({
          success: false,
          message: 'OTP and session token are required',
        });
      }

      // Validate token signature/expiry
      try {
        jwt.verify(otpSessionToken, process.env.JWT_SECRET as string);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired session token',
        });
      }

      const record = await prisma.passwordResetOTP.findUnique({
        where: { otpSessionToken },
      });
      if (!record) {
        return res
          .status(404)
          .json({ success: false, message: 'Session not found' });
      }
      if (record.consumedAt) {
        return res
          .status(400)
          .json({ success: false, message: 'OTP already used' });
      }
      if (new Date(record.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'OTP expired' });
      }

      const isMatch = await bcrypt.compare(otp, record.codeHash);
      if (!isMatch) {
        await prisma.passwordResetOTP.update({
          where: { otpSessionToken },
          data: { attempts: { increment: 1 } },
        });
        return res
          .status(400)
          .json({ success: false, message: 'Incorrect OTP' });
      }

      const resetToken = jwt.sign(
        { userId: record.userId, type: 'password_reset' },
        process.env.JWT_SECRET as string,
        { expiresIn: '10m' }
      );

      await prisma.passwordResetOTP.update({
        where: { otpSessionToken },
        data: { consumedAt: new Date() },
      });

      return res
        .status(200)
        .json({ success: true, message: 'OTP verified', data: { resetToken } });
    } catch (error) {
      console.error('Forgot password verify error:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  }

  async forgotPasswordReset(req: Request, res: Response) {
    try {
      const { resetToken, newPassword } = req.body as {
        resetToken?: string;
        newPassword?: string;
      };

      if (!resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required',
        });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(
          resetToken,
          process.env.JWT_SECRET as string
        ) as any;
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid or expired reset token' });
      }

      if (decoded?.type !== 'password_reset' || !decoded?.userId) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid reset token payload' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword },
      });

      return res
        .status(200)
        .json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Forgot password reset error:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  }
}
