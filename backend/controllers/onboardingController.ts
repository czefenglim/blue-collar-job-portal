import {
  Gender,
  PrismaClient,
  TransportMode,
  WorkingHours,
} from '@prisma/client';
import { refineAnswers } from '../services/aiRefine';
import { generateResumePDF } from '../services/generateResume';
import { uploadResumeToS3 } from '../services/s3Uploader';
import { getResumeSignedUrl } from '../services/s3Service';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

interface UserProfile {
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

// For resume generation only
interface ResumeProfile {
  fullName: string;
  email: string;
  phone: string; // no `| null`
  skills: {
    id: number;
    name: string;
  }[];
}

export class OnboardingController {
  // Fetch all industries
  async getIndustries(req: any, res: any) {
    try {
      const industries = await prisma.industry.findMany();
      res.json(industries);
    } catch (error) {
      console.error('Error fetching industries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Save or update user profile
  async saveUserProfile(req: any, res: any) {
    const {
      dateOfBirth,
      gender,
      nationality,
      address,
      city,
      state,
      postcode,
      profilePicture,
      preferredSalaryMin,
      preferredSalaryMax,
      availableFrom,
      workingHours,
      transportMode,
      maxTravelDistance,
      experienceYears,
      skills, // array of skill IDs
      certifications,
      languages, // array of language IDs
    }: UserProfile = req.body;

    try {
      const userId = Number(req.user?.userId);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: missing userId' });
      }

      // Upsert profile first
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          dateOfBirth,
          gender,
          nationality,
          address,
          city,
          state,
          postcode,
          profilePicture,
          preferredSalaryMin,
          preferredSalaryMax,
          availableFrom,
          workingHours,
          transportMode,
          maxTravelDistance,
          experienceYears: experienceYears ?? undefined,
          certifications,
          profileCompleted: true,
        },
        create: {
          userId,
          dateOfBirth,
          gender,
          nationality,
          address,
          city,
          state,
          postcode,
          profilePicture,
          preferredSalaryMin,
          preferredSalaryMax,
          availableFrom,
          workingHours,
          transportMode,
          maxTravelDistance,
          experienceYears: experienceYears ?? undefined,
          certifications,
          profileCompleted: true,
        },
      });

      // Handle skills relation
      if (skills && Array.isArray(skills)) {
        // Clear old skills, then insert new
        await prisma.userSkill.deleteMany({
          where: { userId: profile.userId },
        });
        await prisma.userSkill.createMany({
          data: skills.map((skillId: number) => ({
            userId: profile.userId,
            skillId,
          })),
          skipDuplicates: true,
        });
      }

      // Handle languages relation
      if (languages && Array.isArray(languages)) {
        // Clear old languages, then insert new
        await prisma.userLanguage.deleteMany({
          where: { userId: profile.userId },
        });
        await prisma.userLanguage.createMany({
          data: languages.map((languageId: number) => ({
            userId: profile.userId,
            languageId,
          })),
          skipDuplicates: true,
        });
      }

      res.status(200).json({
        message: 'User profile saved successfully',
        profile,
      });

      console.log('Saved user profile for user:', req.user);
    } catch (error) {
      console.error('Error saving user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Save user's industries (replace old selections with new ones)
  async saveUserIndustries(req: any, res: any) {
    const { industryIds } = req.body; // expecting an array of industry IDs
    const userId = Number(req.user?.userId);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing userId' });
    }

    if (!Array.isArray(industryIds) || industryIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'industryIds must be a non-empty array' });
    }

    try {
      // Step 1: Remove old industries for this user
      await prisma.userIndustry.deleteMany({
        where: { userId },
      });

      // Step 2: Insert new industries
      const newIndustries = await prisma.userIndustry.createMany({
        data: industryIds.map((id: number) => ({
          userId,
          industryId: id,
        })),
        skipDuplicates: true,
      });

      res.status(200).json({
        message: 'User industries saved successfully',
        count: newIndustries.count,
      });
    } catch (error) {
      console.error('Error saving user industries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getResumeQuestions(req: any, res: any) {
    try {
      const questions = await prisma.resumeQuestion.findMany({
        orderBy: { id: 'asc' },
      });
      res.json(questions);
    } catch (err) {
      console.error('Error fetching resume questions:', err);
      res.status(500).json({ error: 'Failed to fetch resume questions' });
    }
  }

  async saveResumeAnswers(req: any, res: any) {
    console.log('🎯 BACKEND: saveResumeAnswers called');
    console.log('📦 BACKEND: Full request details:');
    console.log('  Method:', req.method);
    console.log('  URL:', req.url);
    console.log('  Headers:', req.headers);
    console.log('  Body:', req.body);
    console.log('  Body type:', typeof req.body);
    console.log('  User:', req.user);

    // Check if body exists and has the right structure
    if (!req.body) {
      console.error('❌ BACKEND: req.body is completely undefined');
      return res.status(400).json({ error: 'Request body is required' });
    }

    if (typeof req.body !== 'object') {
      console.error('❌ BACKEND: req.body is not an object:', req.body);
      return res
        .status(400)
        .json({ error: 'Request body must be JSON object' });
    }

    const { answers } = req.body;
    const userId = Number(req.user?.userId);

    console.log('🔍 BACKEND: Extracted data:');
    console.log('  answers:', answers);
    console.log('  answers type:', typeof answers);
    console.log('  isArray:', Array.isArray(answers));
    console.log('  userId:', userId);

    if (!userId) {
      console.error('❌ BACKEND: Unauthorized - missing userId');
      return res.status(401).json({ error: 'Unauthorized: missing userId' });
    }

    if (!Array.isArray(answers)) {
      console.error(
        '❌ BACKEND: answers is not an array. Type:',
        typeof answers
      );
      return res.status(400).json({ error: 'answers must be an array' });
    }

    if (answers.length === 0) {
      console.error('❌ BACKEND: answers array is empty');
      return res
        .status(400)
        .json({ error: 'answers must be a non-empty array' });
    }

    // Log each answer in the array
    console.log('📝 BACKEND: Answers array contents:');
    answers.forEach((ans, index) => {
      console.log(`  [${index}] questionId:`, ans.questionId);
      console.log(`  [${index}] answer:`, ans.answer);
      console.log(`  [${index}] answer type:`, typeof ans.answer);
    });

    try {
      console.log('💾 BACKEND: Starting database operations...');

      const results = await Promise.all(
        answers.map((ans: { questionId: string; answer: any }) =>
          prisma.resumeAnswer.upsert({
            where: {
              userId_questionId: {
                userId,
                questionId: ans.questionId,
              },
            },
            update: {
              answer: ans.answer,
              updatedAt: new Date(),
            },
            create: {
              userId,
              questionId: ans.questionId,
              answer: ans.answer,
            },
          })
        )
      );

      console.log(`✅ BACKEND: Successfully saved ${results.length} answers`);

      res.status(200).json({
        message: 'Resume answers saved successfully',
        count: results.length,
        answers: results,
      });
    } catch (error) {
      console.error('💥 BACKEND: Error saving resume answers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // Add to OnboardingController class
  async getSkills(req: any, res: any) {
    try {
      const skills = await prisma.skill.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      res.json(skills);
    } catch (error) {
      console.error('Error fetching skills:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getLanguages(req: any, res: any) {
    try {
      const languages = await prisma.language.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      res.json(languages);
    } catch (error) {
      console.error('Error fetching languages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateResume(req: any, res: any) {
    try {
      const userId = Number(req.user?.userId);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // 1. Fetch profile + answers
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          skills: { include: { skill: true } },
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      // 2. Map to Profile interface (for generateResumePDF)
      const mappedProfile: ResumeProfile = {
        fullName: profile.user.fullName,
        email: profile.user.email,
        phone: profile.user.phoneNumber ?? '', // fallback if null
        skills: profile.skills.map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
        })),
      };

      // 3. Normalize answers
      const answersRaw = await prisma.resumeAnswer.findMany({
        where: { userId },
      });
      const answers = answersRaw.map((a) => ({
        questionId: a.questionId,
        answer:
          typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer),
      }));

      // 4. Refine answers
      const refinedAnswers = await refineAnswers(answers);

      // 5. Generate PDF buffer
      const pdfBuffer = await generateResumePDF(mappedProfile, refinedAnswers);

      // 6. Upload to S3 → returns { key, resumeUrl }
      const { key, resumeUrl } = await uploadResumeToS3(userId, pdfBuffer);

      // 7. Save S3 key in DB (better than saving signed URL)
      await prisma.userProfile.update({
        where: { userId },
        data: { resumeUrl: key }, // store only the key
      });

      // 8. Return both key and raw URL
      res.json({
        message: 'Resume generated',
        key, // e.g. "resumes/123.pdf"
        resumeUrl, // raw bucket URL (not signed)
      });
    } catch (err) {
      console.error('Error generating resume:', err);
      res.status(500).json({ error: 'Failed to generate resume' });
    }
  }

  async getResume(req: Request, res: Response) {
    const key = (req.params as any)[0]; // wildcard captured here
    if (!key) return res.status(400).json({ error: 'Missing resume key' });

    const url = await getResumeSignedUrl(key);
    return res.json({ resumeUrl: url });
  }
}
