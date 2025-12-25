import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Industry } from '../types/industry';

const prisma = new PrismaClient();

export const getIndustries = async (req: Request, res: Response) => {
  try {
    const lang = (req.query.lang as string) || 'en';

    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        icon: true,
        name: true,
        name_en: true,
        name_ms: true,
        name_zh: true,
        name_ta: true,
        description: true,
        description_en: true,
        description_ms: true,
        description_zh: true,
        description_ta: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const translatedIndustries = industries.map((ind: Industry) => {
      const industry = ind as unknown as Industry;
      const name = (industry[`name_${lang}`] as string) || industry.name;
      const description =
        (industry[`description_${lang}`] as string) || industry.description;

      return {
        id: industry.id,
        slug: industry.slug,
        icon: industry.icon,
        name,
        description,
      };
    });

    res.json({
      success: true,
      data: translatedIndustries,
    });
  } catch (error) {
    console.error('Get industries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch industries',
    });
  }
};
