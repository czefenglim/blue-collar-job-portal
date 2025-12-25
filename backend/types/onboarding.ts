import { Gender, TransportMode } from './user';
import { WorkingHours } from './job';

export interface OnboardingUserProfile {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: Gender;
  nationality: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  profilePicture?: string;

  // Job Preferences
  preferredSalaryMin: number | null;
  preferredSalaryMax: number | null;
  availableFrom: Date | null;
  workingHours: WorkingHours | null;
  transportMode: TransportMode | null;
  maxTravelDistance: number | null;

  // Skills and Experience
  experienceYears: number | null;
  certifications: string | null;

  skills?: number[];
  languages?: number[];
}

export interface ResumeProfile {
  fullName: string;
  email: string;
  phone: string;
  skills: {
    id: number;
    name: string;
  }[];
  gender?: string;
  dateOfBirth?: string;
  profilePicture?: string;
}

export interface ResumeAnswerItem {
  questionId: string;
  answer: string | string[] | number | boolean; // Flexible answer type
}

export interface SaveResumeAnswersRequest {
  answers: ResumeAnswerItem[];
}

export interface ResumeQuestionOption {
  value: string;
  label: string;
}

export interface ResumeQuestion {
  id: number;
  question: string;
  type: string;
  options?: string[] | ResumeQuestionOption[] | null;
  section: string;
}
