import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role?: string;
  };
}

export interface MulterAuthRequest extends AuthRequest {
  file?: Express.Multer.File;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

export type SupportedLang = 'en' | 'ms' | 'zh' | 'ta';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  lang?: SupportedLang;
}
