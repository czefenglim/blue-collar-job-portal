import { SupportedLang } from './common';

import { CompanySize } from '@prisma/client';
export { CompanySize };

export interface Company {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  companySize?: CompanySize | null;
  isVerified: boolean;
  isActive: boolean;
  industryId?: number | null;
  userId?: number | null;

  // Translations
  description_ms?: string | null;
  description_ta?: string | null;
  description_zh?: string | null;
  description_en?: string | null;
  name_ms?: string | null;
  name_ta?: string | null;
  name_zh?: string | null;
  name_en?: string | null;

  createdAt: Date;
  updatedAt: Date;

  [key: string]: unknown; // Allow dynamic property access
}

export interface CompanyInput {
  name: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  companySize?: CompanySize;
  industryId?: number;

  // Translations (optional)
  description_ms?: string;
  description_ta?: string;
  description_zh?: string;
  description_en?: string;
}

export interface CompanyWithDetails extends Company {
  companySizeLabel?: string | null;
  industry?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}
