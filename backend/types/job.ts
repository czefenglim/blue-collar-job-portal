import { Company } from './company';
import { SupportedLang } from './common';

import {
  JobType,
  WorkingHours,
  ExperienceLevel,
  SalaryType,
  ApprovalStatus,
} from '@prisma/client';
export { JobType, WorkingHours, ExperienceLevel, SalaryType, ApprovalStatus };

export interface Job {
  id: number;
  title: string;
  slug: string;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  industryId: number;
  companyId: number;
  jobType: JobType;
  workingHours: WorkingHours;
  experienceLevel: ExperienceLevel;
  address?: string | null;
  city: string;
  state: string;
  postcode?: string | null;
  isRemote: boolean;
  latitude?: number | null;
  longitude?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: SalaryType | null;
  isActive: boolean;
  isFeatured: boolean;
  applicationDeadline?: Date | null;
  startDate?: Date | null;
  viewCount: number;
  applicationCount: number;
  approvalStatus: ApprovalStatus;

  // Translations
  title_ms?: string | null;
  title_ta?: string | null;
  title_zh?: string | null;
  title_en?: string | null;
  description_ms?: string | null;
  description_ta?: string | null;
  description_zh?: string | null;
  description_en?: string | null;
  requirements_ms?: string | null;
  requirements_ta?: string | null;
  requirements_zh?: string | null;
  requirements_en?: string | null;
  benefits_ms?: string | null;
  benefits_ta?: string | null;
  benefits_zh?: string | null;
  benefits_en?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  skills?: string; // Comma separated or JSON string
  industryId: number;
  jobType: JobType;
  workingHours: WorkingHours;
  experienceLevel: ExperienceLevel;
  address?: string;
  city: string;
  state: string;
  postcode?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: SalaryType;
  applicationDeadline?: string | Date;
  startDate?: string | Date;

  // Optional pre-provided translations
  title_ms?: string;
  title_ta?: string;
  title_zh?: string;
  // etc...
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  isActive?: boolean;
}

export interface JobWithDetails extends Job {
  company: Company;
  industry: {
    id: number;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  savedJobs?: { id: number }[];
  reports?: { id: number }[];
  applications?: { id: number; status: string; appliedAt: Date }[];
  jobTypeLabel?: string | null;
  workingHoursLabel?: string | null;
  experienceLevelLabel?: string | null;
  salaryTypeLabel?: string | null;
  isSaved?: boolean;
  isReported?: boolean;
  hasApplied?: boolean;
  applicationStatus?: string | null;

  [key: string]: unknown; // Safer than any
}

export interface SavedJobWithDetails {
  id: number;
  userId: number;
  jobId: number;
  savedAt: Date;
  job: JobWithDetails;
}
