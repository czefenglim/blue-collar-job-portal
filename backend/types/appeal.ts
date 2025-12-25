import { AppealStatus } from '@prisma/client';
export { AppealStatus };

export interface Appeal {
  id: number;
  reportId: number;
  employerId: number;
  explanation: string;
  evidence?: string | null;
  status: AppealStatus;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Translations
  explanation_ms?: string | null;
  explanation_en?: string | null;
  explanation_zh?: string | null;
  explanation_ta?: string | null;

  reviewNotes_ms?: string | null;
  reviewNotes_en?: string | null;
  reviewNotes_zh?: string | null;
  reviewNotes_ta?: string | null;

  evidenceUrls?: string[];

  [key: string]: unknown;
}

export interface SubmitAppealRequest {
  reportId: number;
  explanation: string;
  files?: any[]; // Multer files
}

export interface ReviewAppealRequest {
  status: 'ACCEPTED' | 'REJECTED_FINAL';
  reviewNotes?: string;
}
