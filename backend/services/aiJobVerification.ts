// src/services/aiJobVerification.service.ts (Updated with REJECTED_AI)

import { PrismaClient } from '@prisma/client';
import { CohereClientV2 } from 'cohere-ai';
import { AssistantMessageResponseContentItem } from 'cohere-ai/api/types/AssistantMessageResponseContentItem';
import { VerificationResult } from '../types/ai';
import { Job } from '../types/job';

const prisma = new PrismaClient();

// Initialize Cohere client
const cohere = new CohereClientV2({
  token:
    process.env.COHERE_API_KEY || '9KjRTgmeA7d93zMJ5yBcZDOlXHLZFGXNaPebOf2q',
});

interface JobData {
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  city: string;
  state: string;
  industryId: number;
  companyId: number;
}

interface AIAnalysisResult {
  riskScore: number;
  isScam: boolean;
  isProfessional: boolean;
  isSalaryRealistic: boolean;
  reasoning: string;
  specificFlags: string[];
}

export class AIJobVerificationService {
  // Minimum acceptable lengths (basic validation)
  private static MIN_DESCRIPTION_LENGTH = 100;
  private static MIN_TITLE_LENGTH = 10;
  private static MIN_REQUIREMENTS_LENGTH = 50;

  /**
   * Main verification function using Cohere AI
   * Returns APPROVED, REJECTED_AI, or PENDING status
   */
  static async verifyJob(jobData: JobData): Promise<VerificationResult> {
    const flags: string[] = [];
    let riskScore = 0;

    // 1. Basic field validation (quick check)
    const requiredFieldsCheck = this.checkRequiredFields(jobData);
    if (!requiredFieldsCheck.isValid) {
      flags.push(...requiredFieldsCheck.flags);
      riskScore += 15;
    }

    // 2. Check for duplicate/spam posts
    const duplicateCheck = await this.checkDuplicatePosts(jobData);
    if (duplicateCheck.isDuplicate) {
      flags.push(...duplicateCheck.flags);
      riskScore += 25;
    }

    // 3. Check company track record
    const companyCheck = await this.checkCompanyHistory(jobData.companyId);
    if (companyCheck.isNewOrSuspicious) {
      flags.push(...companyCheck.flags);
      riskScore += 15;
    }

    // 4. ✅ USE COHERE AI FOR CONTENT ANALYSIS
    const aiAnalysis = await this.analyzeJobContentWithAI(jobData);

    if (aiAnalysis) {
      riskScore += aiAnalysis.riskScore;
      flags.push(...aiAnalysis.specificFlags);

      console.log('🤖 AI Analysis:', {
        riskScore: aiAnalysis.riskScore,
        isScam: aiAnalysis.isScam,
        isProfessional: aiAnalysis.isProfessional,
        reasoning: aiAnalysis.reasoning,
      });
    } else {
      // Fallback if AI fails
      flags.push('AI analysis unavailable - flagged for manual review');
      riskScore += 20;
    }

    // Decision logic
    const isClean = riskScore < 30 && flags.length === 0;
    const autoApprove = riskScore < 20 && !aiAnalysis?.isScam;

    return {
      isClean,
      autoApprove,
      flagReason: flags.length > 0 ? flags.join('; ') : undefined,
      riskScore,
      flags,
    };
  }

  /**
   * ✅ Analyze job content using Cohere AI
   */
  private static async analyzeJobContentWithAI(
    jobData: JobData
  ): Promise<AIAnalysisResult | null> {
    try {
      const salaryInfo =
        jobData.salaryMin && jobData.salaryMax
          ? `RM${jobData.salaryMin} - RM${jobData.salaryMax} ${
              jobData.salaryType || 'MONTHLY'
            }`
          : 'Not specified';

      const prompt = `You are a job posting fraud detection AI for a Malaysian blue-collar job portal. Analyze the following job posting for scams, fraud, or unprofessional content.

**Job Details:**
Title: ${jobData.title}
Description: ${jobData.description}
Requirements: ${jobData.requirements || 'Not provided'}
Benefits: ${jobData.benefits || 'Not provided'}
Salary: ${salaryInfo}
Location: ${jobData.city}, ${jobData.state}

**Analysis Instructions:**
1. Detect scam indicators (e.g., "get rich quick", pyramid schemes, upfront fees, unrealistic promises, excessive use of WhatsApp/Telegram only)
2. Check salary realism for Malaysia (minimum wage is RM1,500/month, typical range RM1,500-RM50,000/month)
3. Evaluate professionalism (grammar, tone, formatting, excessive emojis or capital letters)
4. Identify spam patterns (too generic, copy-paste content, suspicious contact methods)

**Malaysian Context:**
- Minimum wage: RM1,500/month
- Red flags: "registration fee", "training fee", "investment required", "guaranteed income", "work from home guaranteed"
- Common scams: MLM schemes, cryptocurrency mining, fake recruitment

**Output Format (JSON):**
Respond ONLY with valid JSON, no markdown, no explanation. Format:
{
  "riskScore": <number 0-100>,
  "isScam": <true/false>,
  "isProfessional": <true/false>,
  "isSalaryRealistic": <true/false>,
  "reasoning": "<brief explanation>",
  "specificFlags": ["<flag1>", "<flag2>", ...]
}

Risk Score Guide:
- 0-19: Clean, professional job post
- 20-39: Minor concerns, but acceptable
- 40-69: Suspicious, needs human review
- 70-100: Likely scam, auto-reject

Respond ONLY with the JSON object, nothing else.`;

      const response = await cohere.chat({
        model: 'command-a-03-2025',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.message?.content
        ?.filter(
          (
            c
          ): c is Extract<
            AssistantMessageResponseContentItem,
            { type: 'text' }
          > => c.type === 'text'
        )
        .map((c) => c.text)
        .join(' ')
        .trim();

      if (!text) {
        console.error('❌ Cohere returned empty response');
        return null;
      }

      // Clean response (remove markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      console.log('🤖 Cohere AI Response:', cleanedText);

      // Parse JSON response
      const aiResult: AIAnalysisResult = JSON.parse(cleanedText);

      return aiResult;
    } catch (error) {
      console.error('❌ Error analyzing job with Cohere AI:', error);
      return null;
    }
  }

  /**
   * Check if all required fields are filled
   */
  private static checkRequiredFields(jobData: JobData): {
    isValid: boolean;
    flags: string[];
  } {
    const flags: string[] = [];

    if (!jobData.title || jobData.title.trim().length < this.MIN_TITLE_LENGTH) {
      flags.push('Title too short or missing');
    }

    if (
      !jobData.description ||
      jobData.description.trim().length < this.MIN_DESCRIPTION_LENGTH
    ) {
      flags.push('Job description too short or incomplete');
    }

    if (
      !jobData.requirements ||
      jobData.requirements.trim().length < this.MIN_REQUIREMENTS_LENGTH
    ) {
      flags.push('Requirements section too brief');
    }

    if (!jobData.city || !jobData.state) {
      flags.push('Location information incomplete');
    }

    return {
      isValid: flags.length === 0,
      flags,
    };
  }

  /**
   * Check for duplicate or spam posts
   */
  private static async checkDuplicatePosts(jobData: JobData): Promise<{
    isDuplicate: boolean;
    flags: string[];
  }> {
    const flags: string[] = [];

    try {
      // Check for similar job posts from same company in last 7 days
      const recentJobs = await prisma.job.findMany({
        where: {
          companyId: jobData.companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          title: true,
          description: true,
        },
      });

      // Check for exact title match
      const exactMatch = recentJobs.some(
        (job) => job.title.toLowerCase() === jobData.title.toLowerCase()
      );

      if (exactMatch) {
        flags.push('Duplicate job post detected (same title in last 7 days)');
      }

      // Check for spam (too many posts in short time)
      if (recentJobs.length > 10) {
        flags.push('Too many job posts in short period (spam indicator)');
      }

      // Check for very similar descriptions (simple similarity check)
      const similarDescriptions = recentJobs.filter((job) => {
        const similarity = this.calculateSimilarity(
          job.description,
          jobData.description
        );
        return similarity > 0.8; // 80% similar
      });

      if (similarDescriptions.length > 0) {
        flags.push('Very similar job description to recent post');
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }

    return {
      isDuplicate: flags.length > 0,
      flags,
    };
  }

  /**
   * Check company history and track record
   */
  private static async checkCompanyHistory(companyId: number): Promise<{
    isNewOrSuspicious: boolean;
    flags: string[];
  }> {
    const flags: string[] = [];

    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          jobs: {
            where: {
              approvalStatus: 'APPROVED',
            },
          },
          _count: {
            select: {
              jobs: true,
            },
          },
        },
      });

      if (!company) {
        flags.push('Company not found');
        return { isNewOrSuspicious: true, flags };
      }

      // Check if company is newly verified (less than 7 days)
      if (company.verifiedDate) {
        const daysSinceVerification =
          (Date.now() - new Date(company.verifiedDate).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceVerification < 7) {
          flags.push('New company (verified less than 7 days ago)');
        }
      }

      // Check if company has no approved jobs yet
      if (company.jobs.length === 0) {
        flags.push('First job post from this company (requires review)');
      }

      // Check if company has verification issues
      if (!company.isVerified || company.verificationStatus !== 'APPROVED') {
        flags.push('Company verification pending or incomplete');
      }
    } catch (error) {
      console.error('Error checking company history:', error);
      flags.push('Unable to verify company history');
    }

    return {
      isNewOrSuspicious: flags.length > 0,
      flags,
    };
  }

  /**
   * Simple text similarity calculation (Jaccard similarity)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Generate human-readable verification summary
   */
  static generateVerificationSummary(result: VerificationResult): string {
    if (result.autoApprove) {
      return 'Job post passed all AI verification checks and was auto-approved.';
    }

    if (result.flags.length === 0) {
      return 'No issues detected.';
    }

    return `Flagged for review:\n${result.flags
      .map((flag, idx) => `${idx + 1}. ${flag}`)
      .join('\n')}\n\nRisk Score: ${result.riskScore}/100`;
  }
}
