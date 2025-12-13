import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QualityScore {
  score: number; // 0-100
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: {
    profileCompleteness: number;
    experienceMatch: number;
    skillsMatch: number;
    locationMatch: number;
    availabilityScore: number;
  };
  strengths: string[];
  improvements: string[];
}

export class ApplicantQualityService {
  /**
   * Calculate quality score for an applicant relative to a job
   */
  static async calculateQualityScore(
    applicationId: number
  ): Promise<QualityScore> {
    // Get application with user profile and job details
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          include: {
            profile: {
              include: {
                skills: {
                  include: { skill: true },
                },
                industries: {
                  include: { industry: true },
                },
                languages: {
                  include: { language: true },
                },
              },
            },
          },
        },
        job: {
          include: {
            industry: true,
            company: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const { user, job } = application;
    const profile = user.profile;

    let totalScore = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];

    // 1. Profile Completeness (0-25 points)
    let profileCompleteness = 0;
    if (profile) {
      if (profile.dateOfBirth) profileCompleteness += 3;
      if (profile.city && profile.state) profileCompleteness += 4;
      if (profile.experienceYears > 0) profileCompleteness += 4;
      if (profile.skills && profile.skills.length > 0) profileCompleteness += 4;
      if (profile.industries && profile.industries.length > 0)
        profileCompleteness += 3;
      if (profile.languages && profile.languages.length > 0)
        profileCompleteness += 3;
      const hasAnyResume =
        (profile as any).resumeUrl_en ||
        (profile as any).resumeUrl_ms ||
        (profile as any).resumeUrl_zh ||
        (profile as any).resumeUrl_ta ||
        (profile as any).resumeUrl_uploaded;
      if (hasAnyResume) profileCompleteness += 4;

      if (profileCompleteness >= 20) {
        strengths.push('Complete profile with all key information');
      } else if (profileCompleteness < 10) {
        improvements.push('Complete profile to improve visibility');
      }
    } else {
      improvements.push('No profile information available');
    }

    // 2. Experience Match (0-25 points)
    let experienceMatch = 0;
    if (profile) {
      const userExp = profile.experienceYears || 0;

      // Map experience level to expected years
      const expectedYears: Record<string, { min: number; max: number }> = {
        ENTRY_LEVEL: { min: 0, max: 1 },
        JUNIOR: { min: 1, max: 2 },
        MID_LEVEL: { min: 3, max: 5 },
        SENIOR: { min: 5, max: 10 },
        EXPERT: { min: 10, max: 99 },
      };

      const expected = expectedYears[job.experienceLevel] || { min: 0, max: 5 };

      if (userExp >= expected.min && userExp <= expected.max) {
        experienceMatch = 25;
        strengths.push(
          `Experience level matches job requirements (${userExp} years)`
        );
      } else if (userExp >= expected.min - 1 && userExp <= expected.max + 2) {
        experienceMatch = 18;
        strengths.push('Experience level is close to requirements');
      } else if (userExp > expected.max) {
        experienceMatch = 15;
        strengths.push('Exceeds experience requirements');
      } else {
        experienceMatch = 8;
        improvements.push('Gain more experience in the field');
      }
    }

    // 3. Skills Match (0-25 points)
    let skillsMatch = 0;
    if (profile && profile.skills && profile.skills.length > 0) {
      // Parse job skills if stored as JSON string
      let jobSkillIds: number[] = [];
      if (job.skills) {
        try {
          jobSkillIds = JSON.parse(job.skills);
        } catch {
          jobSkillIds = [];
        }
      }

      if (jobSkillIds.length > 0) {
        const userSkillIds = profile.skills.map((s) => s.skillId);
        const matchedSkills = jobSkillIds.filter((id) =>
          userSkillIds.includes(id)
        );
        const matchPercentage =
          (matchedSkills.length / jobSkillIds.length) * 100;

        if (matchPercentage >= 80) {
          skillsMatch = 25;
          strengths.push(
            `Strong skills match (${matchedSkills.length}/${jobSkillIds.length} required skills)`
          );
        } else if (matchPercentage >= 50) {
          skillsMatch = 18;
          strengths.push(
            `Good skills match (${matchedSkills.length}/${jobSkillIds.length} required skills)`
          );
        } else if (matchPercentage >= 25) {
          skillsMatch = 12;
          improvements.push('Develop more relevant skills for this role');
        } else {
          skillsMatch = 5;
          improvements.push('Limited skills match - consider upskilling');
        }
      } else {
        // No specific skills required, give partial credit for having skills
        skillsMatch = profile.skills.length >= 3 ? 15 : 10;
        if (profile.skills.length >= 3) {
          strengths.push(`Has ${profile.skills.length} relevant skills`);
        }
      }
    } else {
      improvements.push('Add skills to profile');
    }

    // 4. Location Match (0-15 points)
    let locationMatch = 0;
    if (profile && profile.city && profile.state) {
      if (job.isRemote) {
        locationMatch = 15;
        strengths.push('Remote work available');
      } else if (profile.state === job.state) {
        if (profile.city?.toLowerCase() === job.city.toLowerCase()) {
          locationMatch = 15;
          strengths.push('Located in the same city as job');
        } else {
          locationMatch = 10;
          strengths.push('Located in the same state');
        }
      } else {
        locationMatch = 5;
        improvements.push('Consider relocation or apply for remote positions');
      }
    } else {
      locationMatch = 5;
      improvements.push('Add location to profile');
    }

    // 5. Availability & Additional Factors (0-10 points)
    let availabilityScore = 0;

    // Has resume
    const hasResume =
      (profile as any)?.resumeUrl_en ||
      (profile as any)?.resumeUrl_ms ||
      (profile as any)?.resumeUrl_zh ||
      (profile as any)?.resumeUrl_ta ||
      (profile as any)?.resumeUrl_uploaded ||
      application.resumeUrl;
    if (hasResume) {
      availabilityScore += 4;
      strengths.push('Resume uploaded');
    } else {
      improvements.push('Upload resume to strengthen application');
    }

    // Has cover letter
    if (application.coverLetter && application.coverLetter.length > 50) {
      availabilityScore += 3;
      strengths.push('Personalized cover letter');
    } else {
      improvements.push('Add a detailed cover letter');
    }

    // Industry match
    if (profile && profile.industries) {
      const hasIndustryMatch = profile.industries.some(
        (ui) => ui.industryId === job.industryId
      );
      if (hasIndustryMatch) {
        availabilityScore += 3;
        strengths.push('Industry preference matches job');
      }
    }

    // Calculate total score
    totalScore =
      profileCompleteness +
      experienceMatch +
      skillsMatch +
      locationMatch +
      availabilityScore;

    // Determine quality level
    let quality: 'HIGH' | 'MEDIUM' | 'LOW';
    if (totalScore >= 70) {
      quality = 'HIGH';
    } else if (totalScore >= 45) {
      quality = 'MEDIUM';
    } else {
      quality = 'LOW';
    }

    return {
      score: Math.min(100, totalScore),
      quality,
      breakdown: {
        profileCompleteness,
        experienceMatch,
        skillsMatch,
        locationMatch,
        availabilityScore,
      },
      strengths: strengths.slice(0, 5), // Top 5 strengths
      improvements: improvements.slice(0, 3), // Top 3 improvements
    };
  }

  /**
   * Get quality scores for multiple applications
   */
  static async getQualityScoresForJob(
    jobId: number
  ): Promise<Map<number, QualityScore>> {
    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      select: { id: true },
    });

    const scores = new Map<number, QualityScore>();

    for (const app of applications) {
      try {
        const score = await this.calculateQualityScore(app.id);
        scores.set(app.id, score);
      } catch (error) {
        console.error(
          `Error calculating score for application ${app.id}:`,
          error
        );
      }
    }

    return scores;
  }

  /**
   * Get color for quality level
   */
  static getQualityColor(quality: 'HIGH' | 'MEDIUM' | 'LOW'): string {
    switch (quality) {
      case 'HIGH':
        return '#10B981'; // Green
      case 'MEDIUM':
        return '#F59E0B'; // Amber
      case 'LOW':
        return '#EF4444'; // Red
    }
  }
}
