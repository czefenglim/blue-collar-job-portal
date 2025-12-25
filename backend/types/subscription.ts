import { PlanType } from '@prisma/client';
export { PlanType };


export interface SubscriptionPlan {
  id: number;
  type: PlanType;
  name: string;
  price: number;
  features: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateSubscriptionPlanRequest {
  price?: number;
  name?: string;
  features?: string[];
  isActive?: boolean;
}
