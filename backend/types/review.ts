export interface Review {
  id: number;
  userId: number;
  companyId: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isAnonymous: boolean;
  isApproved: boolean;
  isVisible: boolean;
  employerReply?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Translations
  comment_ms?: string | null;
  comment_ta?: string | null;
  comment_zh?: string | null;
  comment_en?: string | null;
}

export interface CreateReviewRequest {
  companyId: number;
  rating: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}

export interface ReplyReviewRequest {
  reply: string;
}
