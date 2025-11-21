// src/controllers/admin.controller.ts

import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { AdminAuthRequest, AdminLoginRequest } from '../types/admin';
import { adminService } from '../services/adminService';
import { PrismaClient } from '@prisma/client';
import { EmployerTrustScoreService } from '../services/employerTrustScoreService';

const prisma = new PrismaClient();

export class AdminController {
  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async login(req: AdminAuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password }: AdminLoginRequest = req.body;

      // Check if admin credentials are configured
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        console.error('Admin credentials not configured in .env');
        return res.status(500).json({
          success: false,
          message: 'Admin credentials not configured',
        });
      }

      // Verify email
      if (email.toLowerCase() !== adminEmail.toLowerCase()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin credentials',
        });
      }

      // Verify password (plain text comparison for simplicity)
      if (password !== adminPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin credentials',
        });
      }

      // Generate JWT token with admin flag
      const token = jwt.sign(
        {
          adminId: adminEmail,
          adminEmail: adminEmail,
          isAdmin: true,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: {
          admin: {
            email: adminEmail,
            role: 'ADMIN',
          },
          token,
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during admin login',
      });
    }
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getUsers(req: AdminAuthRequest, res: Response) {
    try {
      const { role, status, search, page = '1', limit = '20' } = req.query;

      const result = await adminService.getUsers({
        role: role as any,
        status: status as any,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  async updateUserStatus(req: AdminAuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status || !['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be ACTIVE, SUSPENDED, or DELETED',
        });
      }

      const user = await adminService.updateUserStatus(
        parseInt(id),
        status,
        reason
      );

      res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        data: { user },
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
      });
    }
  }

  async deleteUser(req: AdminAuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const user = await adminService.deleteUser(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
    }
  }

  // ==========================================
  // JOB MANAGEMENT
  // ==========================================

  async getJobs(req: AdminAuthRequest, res: Response) {
    try {
      const {
        approvalStatus,
        isActive,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const result = await adminService.getJobs({
        approvalStatus: approvalStatus as any,
        isActive:
          isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        message: 'Jobs fetched successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
      });
    }
  }

  async updateJobApproval(req: AdminAuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const { approvalStatus, reason } = req.body;

      if (
        !approvalStatus ||
        !['APPROVED', 'REJECTED_FINAL'].includes(approvalStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid approval status. Must be APPROVED or REJECTED',
        });
      }

      if (approvalStatus === 'REJECTED_FINAL' && !reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const job = await adminService.updateJobApproval(
        parseInt(jobId),
        approvalStatus,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Job ${approvalStatus.toLowerCase()} successfully`,
        data: { job },
      });
    } catch (error) {
      console.error('Update job approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update job approval status',
      });
    }
  }

  async getJobById(req: AdminAuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const job = await adminService.getJobById(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Job details fetched successfully',
        data: job,
      });
    } catch (error: any) {
      console.error('Get job by id error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch job details',
      });
    }
  }

  async getJobCounts(req: AdminAuthRequest, res: Response) {
    try {
      const adminEmail = req.adminEmail;

      if (!adminEmail) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const [pending, approved, rejectedAI, rejectedFinal, appeals] =
        await Promise.all([
          prisma.job.count({ where: { approvalStatus: 'PENDING' } }),
          prisma.job.count({ where: { approvalStatus: 'APPROVED' } }),
          prisma.job.count({ where: { approvalStatus: 'REJECTED_AI' } }),
          prisma.job.count({ where: { approvalStatus: 'REJECTED_FINAL' } }),
          prisma.job.count({ where: { approvalStatus: 'APPEALED' } }),
        ]);

      return res.status(200).json({
        success: true,
        data: {
          pending,
          approved,
          rejected: rejectedAI + rejectedFinal,
          appeals,
        },
      });
    } catch (error: any) {
      console.error('Error fetching job counts:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  async getDashboardAnalytics(req: AdminAuthRequest, res: Response) {
    try {
      const analytics = await adminService.getDashboardAnalytics();

      res.status(200).json({
        success: true,
        message: 'Dashboard analytics fetched successfully',
        data: analytics,
      });
    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard analytics',
      });
    }
  }

  // ==========================================
  // COMPANY MANAGEMENT (with Trust Scores)
  // ==========================================

  /**
   * Get all companies with trust scores
   * GET /api/admin/companies
   */
  async getCompanies(req: AdminAuthRequest, res: Response) {
    try {
      const {
        page = '1',
        limit = '20',
        search = '',
        verificationStatus,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
          { city: { contains: search as string } },
        ];
      }

      if (verificationStatus && verificationStatus !== 'ALL') {
        where.verificationStatus = verificationStatus;
      }

      // Get total count
      const total = await prisma.company.count({ where });

      // Get companies
      const companies = await prisma.company.findMany({
        where,
        include: {
          industry: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              status: true,
            },
          },
          _count: {
            select: {
              jobs: true,
              reviews: true,
            },
          },
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: limitNum,
      });

      // Calculate trust scores for all companies
      const companiesWithScores = await Promise.all(
        companies.map(async (company) => {
          try {
            const trustScore =
              await EmployerTrustScoreService.calculateTrustScore(company.id);
            return {
              ...company,
              trustScore: {
                score: trustScore.score,
                level: trustScore.level,
              },
            };
          } catch (error) {
            return {
              ...company,
              trustScore: null,
            };
          }
        })
      );

      return res.status(200).json({
        success: true,
        data: companiesWithScores,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch companies',
      });
    }
  }

  /**
   * Get pending companies for verification
   * GET /api/admin/companies/pending
   */
  async getPendingCompanies(req: AdminAuthRequest, res: Response) {
    try {
      const { page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where: {
            verificationStatus: 'PENDING',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phoneNumber: true,
              },
            },
            industry: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            verification: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.company.count({
          where: {
            verificationStatus: 'PENDING',
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Pending companies fetched successfully',
        data: {
          companies,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching pending companies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending companies',
      });
    }
  }

  /**
   * Get company details with full trust score breakdown
   * GET /api/admin/companies/:companyId
   */
  async getCompanyDetails(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const id = parseInt(companyId);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      // Get company with all related data
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          industry: true,
          verification: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          jobs: {
            select: {
              id: true,
              title: true,
              approvalStatus: true,
              createdAt: true,
              applicationCount: true,
              jobType: true,
              isActive: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              title: true,
              comment: true,
              isVisible: true,
              isFlagged: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
          _count: {
            select: {
              jobs: true,
              reviews: true,
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      // Calculate trust score
      let trustScore = null;
      try {
        trustScore = await EmployerTrustScoreService.calculateTrustScore(id);
      } catch (error) {
        console.error('Error calculating trust score:', error);
      }

      // Get report count for this company's jobs
      const reportCount = await prisma.report.count({
        where: {
          job: {
            companyId: id,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Company details fetched successfully',
        data: {
          ...company,
          trustScore,
          reportCount,
        },
      });
    } catch (error: any) {
      console.error('Error fetching company details:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch company details',
      });
    }
  }

  /**
   * Get trust score for a specific company
   * GET /api/admin/companies/:companyId/trust-score
   */
  async getCompanyTrustScore(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const id = parseInt(companyId);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      const trustScore = await EmployerTrustScoreService.calculateTrustScore(
        id
      );

      return res.status(200).json({
        success: true,
        data: trustScore,
      });
    } catch (error: any) {
      console.error('Error calculating trust score:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate trust score',
      });
    }
  }

  /**
   * Approve company verification
   * POST /api/admin/companies/:companyId/approve
   */
  async approveCompany(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const adminEmail = req.adminEmail || 'admin';

      const company = await prisma.company.findUnique({
        where: { id: parseInt(companyId) },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      if (company.verificationStatus !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Company is already ${company.verificationStatus.toLowerCase()}`,
        });
      }

      const updatedCompany = await prisma.company.update({
        where: { id: parseInt(companyId) },
        data: {
          verificationStatus: 'APPROVED',
          verifiedDate: new Date(),
          isVerified: true,
          verificationRemark: null,
        },
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminEmail,
          actionType: 'APPROVE_COMPANY' as any,
          targetType: 'COMPANY',
          targetId: parseInt(companyId),
          notes: `Approved company: ${company.name}`,
        },
      });

      console.log(
        `[EMAIL NOTIFICATION] Company approved: ${company.name} (${company.user?.email})`
      );

      res.json({
        success: true,
        message: 'Company approved successfully',
        data: updatedCompany,
      });
    } catch (error) {
      console.error('Error approving company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve company',
      });
    }
  }

  /**
   * Reject company verification
   * POST /api/admin/companies/:companyId/reject
   */
  async rejectCompany(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const { reason } = req.body;
      const adminEmail = req.adminEmail || 'admin';

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const company = await prisma.company.findUnique({
        where: { id: parseInt(companyId) },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      if (company.verificationStatus !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Company is already ${company.verificationStatus.toLowerCase()}`,
        });
      }

      const updatedCompany = await prisma.company.update({
        where: { id: parseInt(companyId) },
        data: {
          verificationStatus: 'REJECTED',
          verificationRemark: reason.trim(),
          isVerified: false,
        },
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminEmail,
          actionType: 'REJECT_COMPANY' as any,
          targetType: 'COMPANY',
          targetId: parseInt(companyId),
          reason: reason.trim(),
          notes: `Rejected company: ${company.name}`,
        },
      });

      console.log(
        `[EMAIL NOTIFICATION] Company rejected: ${company.name} (${company.user?.email}) - Reason: ${reason}`
      );

      res.json({
        success: true,
        message: 'Company rejected',
        data: updatedCompany,
      });
    } catch (error) {
      console.error('Error rejecting company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject company',
      });
    }
  }

  /**
   * Disable a company (set verification status to DISABLED)
   * PATCH /api/admin/companies/:companyId/disable
   */
  async disableCompany(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const adminEmail = req.adminEmail || 'admin';
      const { reason } = req.body;
      const id = parseInt(companyId);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      // Get company
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      if (company.verificationStatus === 'DISABLED') {
        return res.status(400).json({
          success: false,
          message: 'Company is already disabled',
        });
      }

      // Update company verification status
      const updatedCompany = await prisma.company.update({
        where: { id },
        data: {
          verificationStatus: 'DISABLED',
          isVerified: false,
          isActive: false,
        },
      });

      // Suspend all active jobs from this company
      await prisma.job.updateMany({
        where: {
          companyId: id,
          isSuspended: false,
        },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedBy: adminEmail,
          suspensionReason: reason || 'Company disabled by admin',
        },
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminEmail,
          actionType: 'SUSPEND_EMPLOYER' as any,
          targetType: 'COMPANY',
          targetId: id,
          reason: reason || 'Company disabled',
          notes: `Company verification status set to DISABLED. All jobs suspended.`,
        },
      });

      // Suspend the employer user account
      if (company.userId) {
        await prisma.user.update({
          where: { id: company.userId },
          data: {
            status: 'SUSPENDED',
            suspendedAt: new Date(),
            suspendedBy: adminEmail,
            suspensionReason: reason || 'Company disabled by admin',
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company disabled successfully',
        data: updatedCompany,
      });
    } catch (error: any) {
      console.error('Error disabling company:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to disable company',
      });
    }
  }

  /**
   * Enable a company (set verification status back to PENDING or APPROVED)
   * PATCH /api/admin/companies/:companyId/enable
   */
  async enableCompany(req: AdminAuthRequest, res: Response) {
    try {
      const { companyId } = req.params;
      const adminEmail = req.adminEmail || 'admin';
      const { setAsApproved = false } = req.body;
      const id = parseInt(companyId);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      // Get company
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      // Update company verification status
      const updatedCompany = await prisma.company.update({
        where: { id },
        data: {
          verificationStatus: setAsApproved ? 'APPROVED' : 'PENDING',
          isVerified: setAsApproved,
          isActive: true,
        },
      });

      // Unsuspend all jobs from this company that were suspended due to company being disabled
      await prisma.job.updateMany({
        where: {
          companyId: id,
          isSuspended: true,
          suspensionReason: { contains: 'Company disabled' },
        },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
        },
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminEmail,
          actionType: 'APPROVE_COMPANY' as any,
          targetType: 'COMPANY',
          targetId: id,
          notes: `Company re-enabled. Status set to ${
            setAsApproved ? 'APPROVED' : 'PENDING'
          }.`,
        },
      });

      // Re-enable the employer user account
      if (company.userId) {
        await prisma.user.update({
          where: { id: company.userId },
          data: {
            status: 'ACTIVE',
            suspendedAt: null,
            suspendedBy: null,
            suspensionReason: null,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company enabled successfully',
        data: updatedCompany,
      });
    } catch (error: any) {
      console.error('Error enabling company:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to enable company',
      });
    }
  }
}

export const adminController = new AdminController();
