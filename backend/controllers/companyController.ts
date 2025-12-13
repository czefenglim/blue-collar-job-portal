import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSignedDownloadUrl } from '../services/s3Service';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

// Get all companies with review stats
export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const {
      verificationStatus,
      page = '1',
      limit = '20',
      search,
      industryId,
      lang = 'en',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { isActive: true };

    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus;
    } else if (!verificationStatus) {
      // Default to APPROVED if not specified (public view)
      where.verificationStatus = 'APPROVED';
    }

    if (search && typeof search === 'string') {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (industryId && typeof industryId === 'string') {
      where.industryId = parseInt(industryId);
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          industry: {
            select: {
              id: true,
              name: true,
              slug: true,
              name_en: true,
              name_ms: true,
              name_ta: true,
              name_zh: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.count({ where }),
    ]);

    // Get review stats and generate signed URLs for all companies
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const reviewStats = await prisma.review.aggregate({
          where: {
            companyId: company.id,
            isVisible: true,
          },
          _avg: { rating: true },
          _count: { id: true },
        });

        // ✅ Generate signed URL for company logo
        let logoUrl = company.logo;
        if (logoUrl) {
          try {
            logoUrl = await getSignedDownloadUrl(logoUrl, 3600);
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            logoUrl = null;
          }
        }

        const translatedName = (company as any)[`name_${lang}`] || company.name;
        const translatedDescription =
          (company as any)[`description_${lang}`] || company.description;
        const translatedIndustryName =
          (company.industry as any)[`name_${lang}`] || company.industry?.name;

        return {
          ...company,
          ...company,
          name: translatedName,
          description: translatedDescription,
          industry: {
            id: company.industry?.id,
            slug: company.industry?.slug,
            name: translatedIndustryName,
          },
          logo: logoUrl, // ✅ Replace with signed URL
          averageRating: reviewStats._avg.rating
            ? parseFloat(reviewStats._avg.rating.toFixed(1))
            : 0,
          totalReviews: reviewStats._count.id,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: companiesWithStats,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message,
    });
  }
};

// Get single company with review stats
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lang = 'en' } = req.query as any;

    const [company, reviewStats] = await Promise.all([
      prisma.company.findUnique({
        where: { id: parseInt(id) },
        include: {
          industry: {
            select: {
              id: true,
              name: true,
              slug: true,
              name_en: true,
              name_ms: true,
              name_ta: true,
              name_zh: true,
            },
          },
          // include translated company fields for direct access
          // Prisma returns full company so we can index translated columns
        },
      }),
      prisma.review.aggregate({
        where: {
          companyId: parseInt(id),
          isVisible: true,
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ Generate signed URL for company logo
    let logoUrl = company.logo;
    if (logoUrl) {
      try {
        logoUrl = await getSignedDownloadUrl(logoUrl, 3600);
      } catch (error) {
        console.error('Error generating signed URL for company logo:', error);
        logoUrl = null;
      }
    }

    const translatedName = (company as any)[`name_${lang}`] || company.name;
    const translatedDescription =
      (company as any)[`description_${lang}`] || company.description;
    const translatedIndustryName =
      (company.industry as any)[`name_${lang}`] || company.industry?.name;

    return res.status(200).json({
      success: true,
      data: {
        ...company,
        ...company,
        name: translatedName,
        description: translatedDescription,
        industry: {
          id: company.industry?.id,
          slug: company.industry?.slug,
          name: translatedIndustryName,
        },
        logo: logoUrl, // ✅ Replace with signed URL
        averageRating: reviewStats._avg.rating
          ? parseFloat(reviewStats._avg.rating.toFixed(1))
          : 0,
        totalReviews: reviewStats._count.id,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message,
    });
  }
};
