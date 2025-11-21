import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
        name_ms: true,
        name_zh: true,
        name_ta: true,
        description: true,
        description_ms: true,
        description_zh: true,
        description_ta: true,
      },
      orderBy: { name: 'asc' },
    });

    const translatedIndustries = industries.map((ind) => {
      // use "as any" for safe dynamic access
      const name = (ind as any)[`name_${lang}`] || ind.name;
      const description =
        (ind as any)[`description_${lang}`] || ind.description;

      return {
        id: ind.id,
        slug: ind.slug,
        icon: ind.icon,
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
