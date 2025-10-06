import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const updatePreferredLanguage = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { preferredLanguage } = req.body;
    const prisma = new PrismaClient();

    if (!userId || !preferredLanguage) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate input (optional, you can restrict accepted enum values)
    const validLanguages = ['ENGLISH', 'CHINESE', 'MALAY', 'TAMIL'];
    if (!validLanguages.includes(preferredLanguage)) {
      return res.status(400).json({ message: 'Invalid language type' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage },
    });

    return res.status(200).json({
      message: 'Preferred language updated successfully',
      user: {
        id: updatedUser.id,
        preferredLanguage: updatedUser.preferredLanguage,
      },
    });
  } catch (error) {
    console.error('Error updating preferred language:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
