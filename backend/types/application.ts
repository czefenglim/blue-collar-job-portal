import { JobWithDetails } from './job';
import { User } from './user';

import { ApplicationStatus } from '@prisma/client';
export { ApplicationStatus };

export interface JobApplication {
  id: number;
  userId: number;
  jobId: number;
  status: ApplicationStatus;
  coverLetter?: string | null;
  resumeUrl?: string | null;
  appliedAt: Date;
  updatedAt: Date;
  employerNote?: string | null;
  interviewDate?: Date | null;
}

export interface JobApplicationWithDetails extends JobApplication {
  job: JobWithDetails;
  user?: User; // Depending on if we include user details
}

export interface CreateApplicationRequest {
  coverLetter?: string;
  resumeUrl?: string;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  note?: string;
  interviewDate?: string | Date;
}
