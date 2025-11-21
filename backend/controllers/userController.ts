import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from '../utils/geocoding';

const prisma = new PrismaClient();

interface UserPreferences {
  industries: Array<{ id: number; name: string }>;
  preferredLocation?: string;
}

interface UpdatePreferencesBody {
  industries?: number[];
  preferredLocation?: string;
}

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

interface UpdateProfileBody {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  profilePicture?: string;
  preferredSalaryMin?: number;
  preferredSalaryMax?: number;
  availableFrom?: string;
  workingHours?: string;
  transportMode?: string;
  maxTravelDistance?: number;
  experienceYears?: number;
  certifications?: string[];
  resumeUrl?: string;
  industries?: number[];
  skills?: number[];
  languages?: number[];
}

export const getUserPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { lang = 'en' } = req.query; // Get language from query string

    const userPreferences = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        industries: {
          include: {
            industry: true,
          },
        },
      },
    });

    if (!userPreferences) {
      return res.status(404).json({
        success: false,
        error: 'User preferences not found',
      });
    }

    // Map translated industry names
    const translatedIndustries = userPreferences.industries.map((ui) => {
      const ind = ui.industry;
      let translatedName = ind.name;

      if (lang === 'ms' && ind.name_ms) translatedName = ind.name_ms;
      else if (lang === 'zh' && ind.name_zh) translatedName = ind.name_zh;
      else if (lang === 'ta' && ind.name_ta) translatedName = ind.name_ta;

      return {
        id: ind.id,
        name: translatedName,
      };
    });

    const response: UserPreferences = {
      industries: translatedIndustries,
      preferredLocation: userPreferences.city || '',
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user preferences',
    });
  }
};

export const updateUserPreferences = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { industries, preferredLocation }: UpdatePreferencesBody = req.body;

    if (preferredLocation) {
      await prisma.userProfile.update({
        where: { userId },
        data: {
          city: preferredLocation,
        },
      });
    }

    if (industries && Array.isArray(industries)) {
      await prisma.userIndustry.deleteMany({
        where: { userId },
      });

      if (industries.length > 0) {
        await prisma.userIndustry.createMany({
          data: industries.map((industryId) => ({
            userId,
            industryId,
          })),
        });
      }
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
    });
  }
};

export const getSavedJobs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            company: true,
            industry: true,
          },
        },
      },
      orderBy: {
        savedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: savedJobs,
    });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved jobs',
    });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
};

export const markNotificationAsRead = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: {
        id: parseInt(id),
        userId,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
    });
  }
};

export async function getUserProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            nationality: true,
            address: true,
            city: true,
            state: true,
            postcode: true,
            latitude: true, // ADD THIS
            longitude: true, // ADD THIS
            profilePicture: true,
            preferredSalaryMin: true,
            preferredSalaryMax: true,
            availableFrom: true,
            workingHours: true,
            transportMode: true,
            maxTravelDistance: true,
            experienceYears: true,
            certifications: true,
            resumeUrl: true,
            profileCompleted: true,
            industries: {
              select: {
                industry: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            skills: {
              select: {
                skill: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            languages: {
              select: {
                language: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    res.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
}

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updateData: UpdateProfileBody = req.body;

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
      (existingProfile.address !== updateData.address ||
        existingProfile.city !== updateData.city ||
        existingProfile.state !== updateData.state ||
        existingProfile.postcode !== updateData.postcode);

    let coordinates: { latitude: number; longitude: number } | null = null;

    // Geocode if address changed and new address is provided
    if (
      (addressChanged || !existingProfile?.latitude) &&
      (updateData.address ||
        updateData.city ||
        updateData.state ||
        updateData.postcode)
    ) {
      console.log(`Address changed for user ${userId}, geocoding...`);

      const geocodingResult = await geocodeAddress(
        updateData.address || '',
        updateData.city,
        updateData.state,
        updateData.postcode
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

    // Start a transaction to update multiple tables
    const result = await prisma.$transaction(async (tx) => {
      // Update User table
      if (updateData.fullName || updateData.phoneNumber) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(updateData.fullName && { fullName: updateData.fullName }),
            ...(updateData.phoneNumber && {
              phoneNumber: updateData.phoneNumber,
            }),
          },
        });
      }

      // Prepare UserProfile data
      const profileData: any = {};

      // Personal Information
      if (updateData.dateOfBirth)
        profileData.dateOfBirth = new Date(updateData.dateOfBirth);
      if (updateData.gender) profileData.gender = updateData.gender;
      if (updateData.nationality)
        profileData.nationality = updateData.nationality;
      if (updateData.address) profileData.address = updateData.address;
      if (updateData.city) profileData.city = updateData.city;
      if (updateData.state) profileData.state = updateData.state;
      if (updateData.postcode) profileData.postcode = updateData.postcode;
      if (updateData.profilePicture)
        profileData.profilePicture = updateData.profilePicture;

      // ADD COORDINATES IF GEOCODING WAS SUCCESSFUL
      if (coordinates) {
        profileData.latitude = coordinates.latitude;
        profileData.longitude = coordinates.longitude;
      }

      // Job Preferences
      if (updateData.preferredSalaryMin !== undefined)
        profileData.preferredSalaryMin = updateData.preferredSalaryMin;
      if (updateData.preferredSalaryMax !== undefined)
        profileData.preferredSalaryMax = updateData.preferredSalaryMax;
      if (updateData.availableFrom)
        profileData.availableFrom = new Date(updateData.availableFrom);
      if (updateData.workingHours)
        profileData.workingHours = updateData.workingHours;
      if (updateData.transportMode)
        profileData.transportMode = updateData.transportMode;
      if (updateData.maxTravelDistance !== undefined)
        profileData.maxTravelDistance = updateData.maxTravelDistance;

      // Skills and Experience
      if (updateData.experienceYears !== undefined)
        profileData.experienceYears = updateData.experienceYears;
      if (updateData.certifications)
        profileData.certifications = JSON.stringify(updateData.certifications);
      if (updateData.resumeUrl) profileData.resumeUrl = updateData.resumeUrl;

      // Update or create UserProfile
      const userProfile = await tx.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: {
          userId,
          ...profileData,
        },
      });

      // Update industries if provided
      if (updateData.industries && Array.isArray(updateData.industries)) {
        await tx.userIndustry.deleteMany({
          where: { userId },
        });

        if (updateData.industries.length > 0) {
          await tx.userIndustry.createMany({
            data: updateData.industries.map((industryId) => ({
              userId,
              industryId,
            })),
          });
        }
      }

      // Update skills if provided
      if (updateData.skills && Array.isArray(updateData.skills)) {
        await tx.userSkill.deleteMany({
          where: { userId },
        });

        if (updateData.skills.length > 0) {
          await tx.userSkill.createMany({
            data: updateData.skills.map((skillId) => ({
              userId,
              skillId,
            })),
          });
        }
      }

      // Update languages if provided
      if (updateData.languages && Array.isArray(updateData.languages)) {
        await tx.userLanguage.deleteMany({
          where: { userId },
        });

        if (updateData.languages.length > 0) {
          await tx.userLanguage.createMany({
            data: updateData.languages.map((languageId) => ({
              userId,
              languageId,
            })),
          });
        }
      }

      // Check profile completion
      const completedFields = await checkProfileCompletion(userId, tx);
      const profileCompleted = completedFields >= 8;

      // Update profile completion status
      await tx.userProfile.update({
        where: { userId },
        data: { profileCompleted },
      });

      return { userProfile, profileCompleted, geocoded: coordinates !== null };
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

// Helper function to check profile completion
async function checkProfileCompletion(
  userId: number,
  tx: any
): Promise<number> {
  const profile = await tx.userProfile.findUnique({
    where: { userId },
    include: {
      industries: true,
      skills: true,
      languages: true,
    },
  });

  if (!profile) return 0;

  let completedFields = 0;

  // Check each important field
  if (profile.dateOfBirth) completedFields++;
  if (profile.gender) completedFields++;
  if (profile.nationality) completedFields++;
  if (profile.address) completedFields++;
  if (profile.city) completedFields++;
  if (profile.experienceYears > 0) completedFields++;
  if (profile.industries.length > 0) completedFields++;
  if (profile.skills.length > 0) completedFields++;
  if (profile.languages.length > 0) completedFields++;
  if (profile.resumeUrl) completedFields++;

  return completedFields;
}

// Get all industries for dropdown
export async function getIndustries(req: Request, res: Response) {
  try {
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: industries,
    });
  } catch (error) {
    console.error('Get industries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch industries',
    });
  }
}

// Get all skills for dropdown
export async function getSkills(req: Request, res: Response) {
  try {
    const skills = await prisma.skill.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills',
    });
  }
}

// Get all languages for dropdown
export async function getLanguages(req: Request, res: Response) {
  try {
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch languages',
    });
  }
}

/**
 * Get user's location information
 */
export const getUserLocation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.userProfile.findUnique({
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

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('Error fetching user location:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch location',
    });
  }
};
