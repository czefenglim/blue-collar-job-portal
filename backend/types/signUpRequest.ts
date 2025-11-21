// src/types/signUpRequest.ts
import { UserRole } from '@prisma/client';

export interface SignupRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
}
