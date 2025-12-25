export interface Industry {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;

  // Translations
  name_ms?: string | null;
  name_en?: string | null;
  name_zh?: string | null;
  name_ta?: string | null;

  description_ms?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  description_ta?: string | null;

  [key: string]: unknown;
}
