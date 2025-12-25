import { Request } from 'express';

import { UserRole, AccountStatus, Gender, TransportMode } from '@prisma/client';
export { UserRole, AccountStatus, Gender, TransportMode };

export interface User {
  id: number;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: UserRole;
  status: AccountStatus;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: number;
  userId: number;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  profilePicture?: string | null;

  // Job Preferences
  preferredSalaryMin?: number | null;
  preferredSalaryMax?: number | null;
  availableFrom?: Date | null;
  workingHours?: string | null; // Using string to avoid circular dep with Job types, or duplicate enum
  transportMode?: TransportMode | null;
  maxTravelDistance?: number | null;

  // Skills and Experience
  experienceYears: number;
  certifications?: string | null;

  // Resumes
  resumeUrl_en?: string | null;
  resumeUrl_ms?: string | null;
  resumeUrl_zh?: string | null;
  resumeUrl_ta?: string | null;
  resumeUrl_uploaded?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | Date; // Allow string from JSON
  gender?: Gender;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;

  preferredSalaryMin?: number;
  preferredSalaryMax?: number;
  availableFrom?: string | Date;
  workingHours?: string;
  transportMode?: TransportMode;
  maxTravelDistance?: number;

  experienceYears?: number;
  certifications?: string | string[];

  skills?: number[];
  languages?: number[];

  resumeUrl?: string;
  preferredLocation?: string;
  industries?: number[];
}

export interface UpdateUserPreferencesRequest {
  industries?: number[];
  preferredLocation?: string;
}

export interface UpdateProfileBody extends Partial<UpdateUserProfileRequest> {
  profilePicture?: string;
  phoneNumber?: string;
}
