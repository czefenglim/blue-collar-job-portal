import {
  Gender,
  PrismaClient,
  TransportMode,
  WorkingHours,
} from '@prisma/client';
import { refineAnswers } from '../services/aiRefine';
import { generateResumePDF } from '../services/generateResume';
import { uploadResumeToS3 } from '../services/s3Service';
import { getResumeSignedUrl } from '../services/s3Service';
import { Request, Response } from 'express';
import { geocodeAddress } from '../utils/geocoding';

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
  gender?: string;
  dateOfBirth?: string;
  profilePicture?: string;
}

export class OnboardingController {
  // Fetch all industries
  async getIndustries(req: any, res: any) {
    try {
      const { lang = 'en' } = req.query; // default to English if not provided

      const industries = await prisma.industry.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          name_ms: true,
          name_zh: true,
          name_ta: true,
          slug: true,
          icon: true,
          description: true,
          description_ms: true,
          description_zh: true,
          description_ta: true,
        },
        orderBy: { name: 'asc' },
      });

      const translatedIndustries = industries.map((industry) => {
        let translatedName = industry.name;
        let translatedDescription = industry.description;

        if (lang === 'ms' && industry.name_ms) {
          translatedName = industry.name_ms;
          translatedDescription =
            industry.description_ms ?? translatedDescription;
        } else if (lang === 'zh' && industry.name_zh) {
          translatedName = industry.name_zh;
          translatedDescription =
            industry.description_zh ?? translatedDescription;
        } else if (lang === 'ta' && industry.name_ta) {
          translatedName = industry.name_ta;
          translatedDescription =
            industry.description_ta ?? translatedDescription;
        }

        return {
          id: industry.id,
          name: translatedName,
          slug: industry.slug,
          icon: industry.icon,
          description: translatedDescription,
        };
      });

      res.json({
        success: true,
        data: translatedIndustries,
      });
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

      // Get existing profile to check if address changed
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
          address: true,
          city: true,
          state: true,
          postcode: true,
          latitude: true,
          longitude: true,
        },
      });

      // Check if address-related fields have changed
      const addressChanged =
        existingProfile &&
        (existingProfile.address !== address ||
          existingProfile.city !== city ||
          existingProfile.state !== state ||
          existingProfile.postcode !== postcode);

      let coordinates: { latitude: number; longitude: number } | null = null;

      // Geocode if address changed or coordinates don't exist
      if (
        (addressChanged || !existingProfile?.latitude) &&
        (address || city || state || postcode)
      ) {
        console.log(`Address changed for user ${userId}, geocoding...`);

        const geocodingResult = await geocodeAddress(
          address,
          city,
          state,
          postcode
        );

        if (geocodingResult) {
          coordinates = {
            latitude: geocodingResult.latitude,
            longitude: geocodingResult.longitude,
          };
          console.log(`Geocoding successful: ${JSON.stringify(coordinates)}`);
        } else {
          console.warn(
            `Geocoding failed for user ${userId}, continuing without coordinates`
          );
        }
      }

      // Prepare profile data with coordinates
      const profileData = {
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
        // Add coordinates if geocoding was successful
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      };

      // Upsert profile
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: {
          userId,
          ...profileData,
        },
      });

      // Handle skills relation
      if (skills && Array.isArray(skills)) {
        // Clear old skills, then insert new
        await prisma.userSkill.deleteMany({
          where: { userId: profile.userId },
        });

        if (skills.length > 0) {
          await prisma.userSkill.createMany({
            data: skills.map((skillId: number) => ({
              userId: profile.userId,
              skillId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Handle languages relation
      if (languages && Array.isArray(languages)) {
        // Clear old languages, then insert new
        await prisma.userLanguage.deleteMany({
          where: { userId: profile.userId },
        });

        if (languages.length > 0) {
          await prisma.userLanguage.createMany({
            data: languages.map((languageId: number) => ({
              userId: profile.userId,
              languageId,
            })),
            skipDuplicates: true,
          });
        }
      }

      res.status(200).json({
        message: 'User profile saved successfully',
        profile,
        geocoded: coordinates !== null, // Indicate if geocoding was successful
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
      const { lang = 'en' } = req.query; // default to English if no language specified

      const questions = await prisma.resumequestion.findMany({
        orderBy: { id: 'asc' },
      });

      // Map questions based on selected language
      const translatedQuestions = questions.map((q) => {
        let translatedQuestion = q.question; // default English

        if (lang === 'ms' && q.question_ms) translatedQuestion = q.question_ms;
        else if (lang === 'zh' && q.question_zh)
          translatedQuestion = q.question_zh;
        else if (lang === 'ta' && q.question_ta)
          translatedQuestion = q.question_ta;

        return {
          ...q,
          question: translatedQuestion, // replace the default question text
        };
      });

      res.json(translatedQuestions);
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
      const { lang = 'en' } = req.query; // default language

      const skills = await prisma.skill.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          name_ms: true,
          name_zh: true,
          name_ta: true,
        },
      });

      // Apply language-based translation
      const translatedSkills = skills.map((s) => {
        let translatedName = s.name;
        if (lang === 'ms' && s.name_ms) translatedName = s.name_ms;
        else if (lang === 'zh' && s.name_zh) translatedName = s.name_zh;
        else if (lang === 'ta' && s.name_ta) translatedName = s.name_ta;

        return {
          id: s.id,
          name: translatedName,
        };
      });

      res.json(translatedSkills);
    } catch (error) {
      console.error('Error fetching skills:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getLanguages(req: any, res: any) {
    try {
      const { lang = 'en' } = req.query; // default language

      const languages = await prisma.language.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          name_ms: true,
          name_zh: true,
          name_ta: true,
        },
      });

      // Apply language-based translation
      const translatedLanguages = languages.map((l) => {
        let translatedName = l.name;
        if (lang === 'ms' && l.name_ms) translatedName = l.name_ms;
        else if (lang === 'zh' && l.name_zh) translatedName = l.name_zh;
        else if (lang === 'ta' && l.name_ta) translatedName = l.name_ta;

        return {
          id: l.id,
          name: translatedName,
        };
      });

      res.json(translatedLanguages);
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
        phone: profile.user.phoneNumber ?? '',
        gender: profile.gender ?? '',
        dateOfBirth: profile.dateOfBirth
          ? profile.dateOfBirth.toISOString()
          : undefined,
        profilePicture: profile.profilePicture ?? '',
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
