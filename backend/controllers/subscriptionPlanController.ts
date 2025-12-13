import { Request, Response } from 'express';
import { PrismaClient, PlanType } from '@prisma/client';
import { AdminAuthRequest } from '../types/admin';
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role?: string;
  };
}

const DEFAULT_PLANS = [
  {
    type: PlanType.FREE,
    name: 'Free Plan',
    price: 0,
    features: ['1 Job Post', 'View Company Reviews', 'Basic Analytics'],
    isActive: true,
  },
  {
    type: PlanType.PRO,
    name: 'Pro Plan',
    price: 30,
    features: [
      '5 Job Posts',
      'View Company Reviews',
      'Reply to Reviews',
      'Advanced Analytics',
      'Priority Support',
    ],
    isActive: true,
  },
  {
    type: PlanType.MAX,
    name: 'Max Plan',
    price: 60,
    features: [
      'Unlimited Job Posts',
      'View Company Reviews',
      'Reply to Reviews',
      'Advanced Analytics',
      'Priority Support',
      'Featured Job Listings',
    ],
    isActive: true,
  },
];

export const getPlans = async (req: Request, res: Response) => {
  try {
    let plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });

    if (plans.length === 0) {
      // Seed plans
      for (const plan of DEFAULT_PLANS) {
        await prisma.subscriptionPlan.create({
          data: plan,
        });
      }
      plans = await prisma.subscriptionPlan.findMany({
        orderBy: { price: 'asc' },
      });
    }

    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { price, name, features, isActive } = req.body;

    // Admin authorization is handled by the middleware that populates AdminAuthRequest

    const plan = await prisma.subscriptionPlan.update({
      where: { id: Number(id) },
      data: {
        price: price ? Number(price) : undefined,
        name,
        features,
        isActive,
      },
    });

    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
