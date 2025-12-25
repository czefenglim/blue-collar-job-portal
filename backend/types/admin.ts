// src/types/admin.types.ts

import { Request } from 'express';
import { UserRole, AccountStatus, ApprovalStatus } from '@prisma/client';

export interface AdminAuthRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRole?: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserStatusRequest {
  status: AccountStatus;
  reason?: string;
}

export interface UpdateJobApprovalRequest {
  approvalStatus: ApprovalStatus;
  reason?: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: AccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface JobFilters {
  approvalStatus?: ApprovalStatus;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardAnalytics {
  totalJobSeekers: number;
  totalEmployers: number;
  totalJobs: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recentActivity: {
    newUsers: number;
    newJobs: number;
    newApplications: number;
  };
  // ADD THIS:
  reviewStats: {
    totalReviews: number;
    averageRating: number;
    flaggedReviews: number;
    visibleReviews: number;
    hiddenReviews: number;
  };
}
