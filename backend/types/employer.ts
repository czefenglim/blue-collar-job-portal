import { Request } from 'express';
import { CompanySize } from './company';
import { JobType } from './job';

export interface CreateCompanyRequest {
  userId: number;
  companyId?: number;
  companyName: string;
  companyName_ms?: string;
  companyName_ta?: string;
  companyName_zh?: string;
  industry: number | string;
  companySize: CompanySize;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  description?: string;
  description_ms?: string;
  description_ta?: string;
  description_zh?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface CreateFirstJobRequest {
  companyId: number;
  jobId?: number;
  title: string;
  industryId: number;
  jobType: JobType;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string;
  city: string;
  state: string;
  address?: string;
  postcode?: string;
  description: string;
  requirements?: string;
  benefits?: string;
}

export interface MulterAuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role?: string;
  };
  file?: Express.Multer.File;
}
