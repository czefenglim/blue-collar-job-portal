import { Request, Response } from 'express';
import { PrismaClient, ApprovalStatus, Prisma } from '@prisma/client';
import { getSignedDownloadUrl } from '../services/s3Service';
import { Company, CompanyWithDetails } from '../types/company';

const prisma = new PrismaClient();

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

    const where: Prisma.CompanyWhereInput = { isActive: true };

    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus as ApprovalStatus;
    } else if (!verificationStatus) {
      // Default to APPROVED if not specified (public view)
      where.verificationStatus = ApprovalStatus.APPROVED;
    }

    if (search && typeof search === 'string') {
      where.name = { contains: search };
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
      companies.map(
        async (
          company: Company & {
            industry?: {
              id: number;
              name: string;
              slug: string;
              name_en?: string | null;
              name_ms?: string | null;
              name_ta?: string | null;
              name_zh?: string | null;
            } | null;
          }
        ) => {
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

          const comp = company as CompanyWithDetails;
          const translatedName =
            (comp[`name_${lang}`] as string | null | undefined) || company.name;
          const translatedDescription =
            (comp[`description_${lang}`] as string | null | undefined) ||
            company.description;
          const translatedIndustryName =
            ((
              company.industry as unknown as Record<
                string,
                string | null | undefined
              >
            )?.[`name_${lang}`] as string | null | undefined) ||
            company.industry?.name;

          return {
            ...company,
            name: translatedName,
            description: translatedDescription,
            industry: company.industry
              ? {
                  id: company.industry.id,
                  slug: company.industry.slug,
                  name: translatedIndustryName as string | undefined,
                }
              : undefined,
            logo: logoUrl, // ✅ Replace with signed URL
            averageRating: reviewStats._avg.rating
              ? parseFloat(reviewStats._avg.rating.toFixed(1))
              : 0,
            totalReviews: reviewStats._count.id,
          };
        }
      )
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
    const { lang = 'en' } = req.query;

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

    const comp = company as unknown as CompanyWithDetails;
    const translatedName =
      (comp[`name_${lang}`] as string | null | undefined) || comp.name;
    const translatedDescription =
      (comp[`description_${lang}`] as string | null | undefined) ||
      comp.description;
    const translatedIndustryName =
      ((
        comp.industry as unknown as Record<string, string | null | undefined>
      )?.[`name_${lang}`] as string | null | undefined) || comp.industry?.name;

    return res.status(200).json({
      success: true,
      data: {
        ...company,
        name: translatedName,
        description: translatedDescription,
        industry: company.industry
          ? {
              id: company.industry.id,
              slug: company.industry.slug,
              name: translatedIndustryName as string | undefined,
            }
          : undefined,
        logo: logoUrl, // ✅ Replace with signed URL
        averageRating: reviewStats._avg.rating
          ? parseFloat(reviewStats._avg.rating.toFixed(1))
          : 0,
        totalReviews: reviewStats._count.id,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch company';
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: errorMessage,
    });
  }
};
