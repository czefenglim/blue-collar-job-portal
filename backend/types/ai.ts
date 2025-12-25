export interface VerificationResult {
  isClean: boolean;
  autoApprove: boolean;
  flagReason?: string;
  riskScore: number; // 0-100, higher = more risky
  flags: string[];
}

export interface AIAnalysisResult {
  riskScore: number;
  isScam: boolean;
  isProfessional: boolean;
  isSalaryRealistic: boolean;
  reasoning: string;
  specificFlags: string[];
}

export interface AIAction {
  label: string;
  route: string;
  params?: Record<string, unknown>;
}

export interface AIResponse {
  response?: string;
  text?: string;
  tool?: string;
  params?: Record<string, unknown>;
  actions?: AIAction[];
}

export interface ChatRequest {
  message: string;
}
