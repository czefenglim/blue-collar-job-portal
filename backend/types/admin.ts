// src/types/admin.types.ts

import { Request } from 'express';

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
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  reason?: string;
}

export interface UpdateJobApprovalRequest {
  approvalStatus: 'APPROVED' | 'REJECTED_FINAL';
  reason?: string;
}

export interface UserFilters {
  role?: 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  search?: string;
  page?: number;
  limit?: number;
}

export interface JobFilters {
  approvalStatus?:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED_FINAL'
    | 'REJECTED_AI'
    | 'APPEALED';
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
