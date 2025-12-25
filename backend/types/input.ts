import {
  ApprovalStatus,
  ApplicationStatus,
  ReportType,
  ReportStatus,
  AppealStatus,
} from '@prisma/client';

export interface StringFilter {
  contains?: string;
  mode?: 'insensitive';
  equals?: string;
  in?: string[];
}

export interface NumberFilter {
  equals?: number;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}

export interface DateFilter {
  equals?: Date;
  gte?: Date;
  lte?: Date;
  gt?: Date;
  lt?: Date;
}

export interface BooleanFilter {
  equals?: boolean;
}

export interface JobWhereInput {
  id?: number | NumberFilter;
  isActive?: boolean | BooleanFilter;
  approvalStatus?: ApprovalStatus | { in: ApprovalStatus[] };
  title?: string | StringFilter;
  company?: {
    name?: string | StringFilter;
    userId?: number;
  };
  industry?: {
    slug?: string;
  };
  city?: string | StringFilter;
  state?: string | StringFilter;
  jobType?: string;
  experienceLevel?: string;
  salaryMax?: NumberFilter;
  salaryMin?: NumberFilter;
  companyId?: number;
  applicationDeadline?: Date | DateFilter;
  OR?: JobWhereInput[];
  AND?: JobWhereInput[];
}

export interface CompanyWhereInput {
  isActive?: boolean | BooleanFilter;
  verificationStatus?: string;
  name?: string | StringFilter;
  email?: string | StringFilter;
  city?: string | StringFilter;
  industryId?: number;
  OR?: CompanyWhereInput[];
}

export interface JobApplicationWhereInput {
  userId?: number;
  status?: ApplicationStatus;
  jobId?: number;
  job?: JobWhereInput;
}

export interface ReportWhereInput {
  status?: ReportStatus;
  userId?: number;
  jobId?: number;
  reportType?: ReportType;
}

export interface ReviewWhereInput {
  companyId?: number;
  isVisible?: boolean;
  rating?: number;
  createdAt?: DateFilter | Date | object; // Allow for object filter like { gte: Date }
}

export interface ReviewOrderByWithRelationInput {
  createdAt?: 'asc' | 'desc';
  rating?: 'asc' | 'desc';
}

export interface JobAppealWhereInput {
  status?: AppealStatus;
  jobId?: number;
  employerId?: number;
}

export interface AppealWhereInput {
  status?: AppealStatus;
  reportId?: number;
  employerId?: number;
}
