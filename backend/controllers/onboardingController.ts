import {
  Gender,
  PrismaClient,
  TransportMode,
  WorkingHours,
} from '@prisma/client';
import { refineAnswers } from '../services/aiRefine';
import { generateResumePDF } from '../services/generateResume';
import {
  uploadResumeToS3,
  uploadProfilePicture,
  deleteOldFile,
  uploadResumeBufferToS3,
} from '../services/s3Service';
import { getResumeSignedUrl } from '../services/s3Service';
import { Request, Response } from 'express';
import { geocodeAddress } from '../utils/geocoding';
import multer from 'multer';
import { translateText } from '../services/googleTranslation';

const prisma = new PrismaClient();

const upload = multer({ storage: multer.memoryStorage() });

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
          name_en: true,
          name_ms: true,
          name_zh: true,
          name_ta: true,
          slug: true,
          icon: true,
          description: true,
          description_en: true,
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
        } else if (lang === 'en' && industry.name_en) {
          translatedName = industry.name_en;
          translatedDescription =
            industry.description_en ?? translatedDescription;
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

  async uploadProfilePicture(req: any, res: any) {
    try {
      const userId = Number(req.user?.userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: missing userId',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
        });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds 5MB limit',
        });
      }

      // Get existing profile to delete old picture
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { profilePicture: true },
      });

      console.log(`📸 Uploading profile picture for user ${userId}`);

      // Upload new picture to S3
      const uploadResult = await uploadProfilePicture(
        userId,
        req.file.buffer,
        req.file.mimetype
      );

      console.log(`✅ Profile picture uploaded to S3:`, uploadResult.url);

      await prisma.userProfile.upsert({
        where: { userId },
        update: { profilePicture: uploadResult.key }, // ← Store key
        create: {
          userId,
          profilePicture: uploadResult.key, // ← Store key
        },
      });

      // Delete old picture if exists (async, don't wait)
      if (
        existingProfile?.profilePicture &&
        existingProfile.profilePicture.includes('amazonaws.com')
      ) {
        deleteOldFile(existingProfile.profilePicture).catch((err) =>
          console.error('Error deleting old profile picture:', err)
        );
      }

      res.status(200).json({
        success: true,
        data: {
          profilePicture: uploadResult.url,
          key: uploadResult.key,
        },
        message: 'Profile picture uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture',
      });
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
      // ❌ REMOVED: profilePicture - now handled separately
      preferredSalaryMin,
      preferredSalaryMax,
      availableFrom,
      workingHours,
      transportMode,
      maxTravelDistance,
      experienceYears,
      skills,
      certifications,
      languages,
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
          profilePicture: true, // ✅ Keep existing profilePicture
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

      // ✅ Prepare profile data WITHOUT profilePicture
      const profileData = {
        dateOfBirth,
        gender,
        nationality,
        address,
        city,
        state,
        postcode,
        // ❌ DO NOT update profilePicture here - it's handled by uploadProfilePicture endpoint
        preferredSalaryMin,
        preferredSalaryMax,
        availableFrom,
        workingHours,
        transportMode,
        maxTravelDistance,
        experienceYears: experienceYears ?? undefined,
        certifications,
        profileCompleted: true,
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      };

      // Upsert profile (preserve existing profilePicture)
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: {
          userId,
          ...profileData,
          // ✅ Keep existing profilePicture on create if user already uploaded it
          profilePicture: existingProfile?.profilePicture,
        },
      });

      // Handle skills relation
      if (skills && Array.isArray(skills)) {
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
        geocoded: coordinates !== null,
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
      const targetLang: 'en' | 'ms' | 'zh' | 'ta' = [
        'en',
        'ms',
        'zh',
        'ta',
      ].includes(lang)
        ? (lang as any)
        : 'en';

      const questions = await prisma.resumequestion.findMany({
        orderBy: { id: 'asc' },
      });

      // Helper: deterministic translations for common option sets
      const mapKnownOption = (
        opt: string,
        langCode: 'en' | 'ms' | 'zh' | 'ta'
      ) => {
        const key = (opt || '').trim().toLowerCase();
        const YES_NO: Record<
          string,
          Record<'en' | 'ms' | 'zh' | 'ta', string>
        > = {
          yes: { en: 'Yes', ms: 'Ya', zh: '是', ta: 'ஆம்' },
          no: { en: 'No', ms: 'Tidak', zh: '否', ta: 'இல்லை' },
        };

        const EDUCATION: Record<
          string,
          Record<'en' | 'ms' | 'zh' | 'ta', string>
        > = {
          primary: {
            en: 'Primary',
            ms: 'Sekolah Rendah',
            zh: '小学',
            ta: 'தொடக்கப் பள்ளி',
          },
          secondary: {
            en: 'Secondary',
            ms: 'Sekolah Menengah',
            zh: '中学',
            ta: 'மேல்நிலைப் பள்ளி',
          },
          diploma: { en: 'Diploma', ms: 'Diploma', zh: '文凭', ta: 'டிப்ளமா' },
          degree: { en: 'Degree', ms: 'Ijazah', zh: '学士', ta: 'பட்டம்' },
          other: { en: 'Other', ms: 'Lain-lain', zh: '其他', ta: 'பிற' },
        };

        if (YES_NO[key]) return YES_NO[key][langCode];
        if (EDUCATION[key]) return EDUCATION[key][langCode];
        return null;
      };

      // Map and translate questions and options based on selected language
      const translatedQuestions = await Promise.all(
        questions.map(async (q) => {
          let translatedQuestion = q.question; // default English

          if (targetLang === 'ms' && q.question_ms)
            translatedQuestion = q.question_ms;
          else if (targetLang === 'zh' && q.question_zh)
            translatedQuestion = q.question_zh;
          else if (targetLang === 'ta' && q.question_ta)
            translatedQuestion = q.question_ta;

          let translatedOptions = q.options as any;
          // Translate option labels if present and target language is not English
          if (targetLang !== 'en' && Array.isArray(translatedOptions)) {
            translatedOptions = await Promise.all(
              translatedOptions.map(async (opt: any) => {
                try {
                  if (typeof opt === 'string') {
                    // First try deterministic mapping for common sets
                    const mapped = mapKnownOption(opt, targetLang);
                    if (mapped) return mapped;
                    const t = await translateText(opt, targetLang);
                    return t || opt;
                  }
                  if (opt && typeof opt === 'object' && 'label' in opt) {
                    const mapped = mapKnownOption(
                      (opt as any).label,
                      targetLang
                    );
                    if (mapped) return { ...opt, label: mapped };
                    const t = await translateText(
                      (opt as any).label,
                      targetLang
                    );
                    return { ...opt, label: t || (opt as any).label };
                  }
                } catch (e) {
                  // Fallback: return original option on translation error
                  return opt;
                }
                return opt;
              })
            );
          }

          return {
            ...q,
            question: translatedQuestion,
            options: translatedOptions,
          };
        })
      );

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
          name_en: true,
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
        else if (lang === 'en' && s.name_en) translatedName = s.name_en;
        else if (lang === 'en' && s.name_en) translatedName = s.name_en;

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
          name_en: true,
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
        else if (lang === 'en' && l.name_en) translatedName = l.name_en;
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

      // 5. Generate English PDF
      const pdf_en = await generateResumePDF(
        mappedProfile,
        refinedAnswers,
        'en'
      );

      // 6. Translate answers for other languages
      async function translateAnswers(
        answers: { questionId: string; answer: string }[],
        targetLang: 'ms' | 'zh' | 'ta'
      ): Promise<{ questionId: string; answer: string }[]> {
        const out: { questionId: string; answer: string }[] = [];
        for (const a of answers) {
          try {
            const translated = await translateText(a.answer, targetLang);
            out.push({ questionId: a.questionId, answer: translated });
          } catch {
            out.push({ questionId: a.questionId, answer: a.answer });
          }
        }
        return out;
      }

      const refined_ms = await translateAnswers(refinedAnswers, 'ms');
      const refined_zh = await translateAnswers(refinedAnswers, 'zh');
      const refined_ta = await translateAnswers(refinedAnswers, 'ta');

      // 7. Build language-specific profiles (translate skill names if available)
      const mapSkills = (
        lang: 'en' | 'ms' | 'zh' | 'ta'
      ): { id: number; name: string }[] => {
        return profile.skills.map((s) => {
          const sk = s.skill as any;
          let name = sk.name as string;
          if (lang === 'ms' && sk.name_ms) name = sk.name_ms;
          else if (lang === 'zh' && sk.name_zh) name = sk.name_zh;
          else if (lang === 'ta' && sk.name_ta) name = sk.name_ta;
          return { id: s.skill.id, name };
        });
      };

      const profile_en = { ...mappedProfile, skills: mapSkills('en') };
      const profile_ms = { ...mappedProfile, skills: mapSkills('ms') };
      const profile_zh = { ...mappedProfile, skills: mapSkills('zh') };
      const profile_ta = { ...mappedProfile, skills: mapSkills('ta') };

      // 8. Generate PDFs for ms/zh/ta
      const [pdf_ms, pdf_zh, pdf_ta] = await Promise.all([
        generateResumePDF(profile_ms, refined_ms, 'ms'),
        generateResumePDF(profile_zh, refined_zh, 'zh'),
        generateResumePDF(profile_ta, refined_ta, 'ta'),
      ]);

      // 9. Upload all four to S3 (resumes_en, resumes_ms, resumes_zh, resumes_ta)
      const [up_en, up_ms, up_zh, up_ta] = await Promise.all([
        uploadResumeBufferToS3(userId, 'en', pdf_en),
        uploadResumeBufferToS3(userId, 'ms', pdf_ms),
        uploadResumeBufferToS3(userId, 'zh', pdf_zh),
        uploadResumeBufferToS3(userId, 'ta', pdf_ta),
      ]);

      // Delete previously uploaded resume from S3 if present
      if (profile.resumeUrl_uploaded) {
        try {
          await deleteOldFile(profile.resumeUrl_uploaded);
        } catch (e) {
          console.error(
            'Failed to delete uploaded resume from S3:',
            profile.resumeUrl_uploaded,
            e
          );
        }
      }

      // 10. Persist keys and metadata
      await prisma.userProfile.update({
        where: { userId },
        data: {
          resumeUrl_en: up_en.key,
          resumeUrl_ms: up_ms.key,
          resumeUrl_zh: up_zh.key,
          resumeUrl_ta: up_ta.key,
          // Clear uploaded resume reference when regenerating AI resumes
          resumeUrl_uploaded: null,
          resumeSource: 'AI_GENERATED',
          resumeGeneratedAt: new Date(),
          resumeVersion: (profile.resumeVersion ?? 0) + 1,
        },
      });

      // 11. Return keys for client
      res.json({
        message: 'Resume generated in all languages',
        keys: {
          en: up_en.key,
          ms: up_ms.key,
          zh: up_zh.key,
          ta: up_ta.key,
        },
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
