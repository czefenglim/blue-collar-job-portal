import { UserRole } from '@prisma/client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
}

export interface DecodedToken {
  userId: number;
  email: string;
  role?: string;
  type?: string;
  iat?: number;
  exp?: number;
}
