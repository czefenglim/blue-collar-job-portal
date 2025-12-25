import { ReportType, ReportStatus } from '@prisma/client';
export { ReportType, ReportStatus };

export interface Report {
  id: number;
  userId: number;
  jobId: number;
  reportType: ReportType;
  description: string;
  evidence?: string | null;
  status: ReportStatus;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;

  evidenceUrls?: string[];

  [key: string]: unknown;
}

export interface CreateReportRequest {
  jobId: number;
  reportType: ReportType;
  description: string;
  evidence?: string;
}
