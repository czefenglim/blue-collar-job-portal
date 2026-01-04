import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { AuthRequest } from '../types/common';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

// Plan configurations
const PLAN_CONFIGS = {
  FREE: {
    name: 'Free Plan',
    price: 0,
    jobPostLimit: 1,
    canReplyToReviews: false,
    stripePriceId: null,
  },
  PRO: {
    name: 'Pro Plan',
    price: 30,
    jobPostLimit: 5,
    canReplyToReviews: true,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO!,
  },
  MAX: {
    name: 'Max Plan',
    price: 60,
    jobPostLimit: -1, // Unlimited
    canReplyToReviews: true,
    stripePriceId: process.env.STRIPE_PRICE_ID_MAX!,
  },
};

// Get current subscription details
export const getCurrentSubscription = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    const company = await prisma.company.findUnique({
      where: { userId },
      include: {
        subscription: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    let subscription = company.subscription;
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          companyId: company.id,
          planType: 'FREE',
          status: 'INACTIVE',
          jobPostLimit: 1,
          jobPostsUsed: 0,
          canReplyToReviews: false,
        },
      });
    }

    const activeJobPosts = await prisma.job.count({
      where: {
        companyId: company.id,
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        activeJobPosts,
        remainingJobPosts:
          subscription.jobPostLimit === -1
            ? -1
            : Math.max(0, subscription.jobPostLimit - activeJobPosts),
        canPostJob:
          subscription.jobPostLimit === -1 ||
          activeJobPosts < subscription.jobPostLimit,
        hasCompletedInitialSubscription:
          company.hasCompletedInitialSubscription,
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message,
    });
  }
};

// Select FREE plan
export const selectFreePlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const company = await prisma.company.findUnique({
      where: { userId },
      include: {
        subscription: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ Update or create subscription with ACTIVE status
    const subscription = await prisma.subscription.upsert({
      where: { companyId: company.id },
      update: {
        planType: 'FREE',
        status: 'ACTIVE', // ✅ Set to ACTIVE when user selects Free plan
        jobPostLimit: 1,
        canReplyToReviews: false,
        stripeSubscriptionId: null,
      },
      create: {
        companyId: company.id,
        planType: 'FREE',
        status: 'ACTIVE', // ✅ Set to ACTIVE
        jobPostLimit: 1,
        jobPostsUsed: 0,
        canReplyToReviews: false,
      },
    });

    // ✅ Mark initial subscription as completed
    await prisma.company.update({
      where: { id: company.id },
      data: { hasCompletedInitialSubscription: true },
    });

    console.log('✅ Free plan activated for company:', company.id);

    return res.status(200).json({
      success: true,
      message: 'Free plan activated successfully',
      data: subscription,
    });
  } catch (error: any) {
    console.error('❌ Error activating free plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate free plan',
      error: error.message,
    });
  }
};

// Create Stripe checkout session
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { planType, expoUrl } = req.body;

    if (!planType || (planType !== 'PRO' && planType !== 'MAX')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type. Must be PRO or MAX',
      });
    }

    const company = await prisma.company.findUnique({
      where: { userId },
      include: { subscription: true, user: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const planConfig = PLAN_CONFIGS[planType as 'PRO' | 'MAX'];

    let stripeCustomerId = company.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: company.user?.email || company.email || undefined,
        name: company.name,
        metadata: {
          companyId: company.id.toString(),
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;

      await prisma.subscription.upsert({
        where: { companyId: company.id },
        update: { stripeCustomerId },
        create: {
          companyId: company.id,
          stripeCustomerId,
          planType: 'FREE',
          status: 'INACTIVE',
          jobPostLimit: 1,
          canReplyToReviews: false,
        },
      });
    }

    const finalExpoUrl =
      expoUrl || process.env.FRONTEND_URL || 'exp://192.168.1.100:8081';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${
        process.env.PAYMENT_REDIRECT_URL
      }/payment-redirect.html?session_id={CHECKOUT_SESSION_ID}&expo_url=${encodeURIComponent(
        finalExpoUrl
      )}`,
      cancel_url: `${
        process.env.PAYMENT_REDIRECT_URL
      }/payment-redirect.html?success=false&expo_url=${encodeURIComponent(
        finalExpoUrl
      )}`,
      metadata: {
        companyId: company.id.toString(),
        userId: userId.toString(),
        planType,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message,
    });
  }
};

// Verify payment success
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const session = await stripe.checkout.sessions.retrieve(
      sessionId as string,
      {
        expand: ['subscription'],
      }
    );

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
      });
    }

    // ⭐️ ROBUSTNESS CHECK: Ensure DB is updated even if webhook failed ⭐️
    const companyId = parseInt(session.metadata?.companyId || '0');
    const planType = session.metadata?.planType as 'PRO' | 'MAX';

    if (companyId && planType) {
      const subscription = await prisma.subscription.findUnique({
        where: { companyId },
      });

      // If subscription doesn't exist OR plan type doesn't match OR stripeSubscriptionId is missing
      if (
        !subscription ||
        subscription.planType !== planType ||
        !subscription.stripeSubscriptionId
      ) {
        console.warn(
          '⚠️ Webhook delay detected! Manually updating subscription in verifyPayment...'
        );
        await handleCheckoutCompleted(session);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        paymentStatus: session.payment_status,
        subscriptionId: session.subscription,
      },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message,
    });
  }
};

// Stripe webhook handler
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`📨 Webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('✅ Subscription created:', subscription.id);
        // Usually handled by checkout.session.completed
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper: Handle checkout completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = parseInt(session.metadata?.companyId || '0');
  const planType = session.metadata?.planType as 'PRO' | 'MAX';

  if (!companyId || !planType) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  if (!stripeSubscriptionId) {
    console.error('No subscription ID in checkout session');
    return;
  }

  // ✅ Retrieve full subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId
  );

  const planConfig = PLAN_CONFIGS[planType];

  // ✅ Safely parse dates

  const currentPeriodEndRaw = (stripeSubscription as any).current_period_end;
  const currentPeriodStartRaw = (stripeSubscription as any)
    .current_period_start;
  const currentPeriodEnd = currentPeriodEndRaw
    ? new Date(currentPeriodEndRaw * 1000)
    : new Date();
  const currentPeriodStart = currentPeriodStartRaw
    ? new Date(currentPeriodStartRaw * 1000)
    : new Date();

  console.log('💳 Creating subscription:', {
    companyId,
    planType,
    subscriptionId: stripeSubscription.id,
    currentPeriodEnd,
    currentPeriodStart,
  });

  await prisma.subscription.upsert({
    where: { companyId },
    update: {
      planType,
      status: 'ACTIVE',
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: planConfig.stripePriceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      jobPostLimit: planConfig.jobPostLimit,
      canReplyToReviews: planConfig.canReplyToReviews,
      billingCycleStart: currentPeriodStart,
      billingCycleEnd: currentPeriodEnd,
    },
    create: {
      companyId,
      planType,
      status: 'ACTIVE',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: planConfig.stripePriceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      jobPostLimit: planConfig.jobPostLimit,
      canReplyToReviews: planConfig.canReplyToReviews,
      billingCycleStart: currentPeriodStart,
      billingCycleEnd: currentPeriodEnd,
    },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { hasCompletedInitialSubscription: true },
  });

  console.log('✅ Subscription created successfully');
}

// Helper: Handle subscription updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.log('⚠️ Subscription not found in DB:', subscription.id);
    return;
  }

  const currentPeriodEndRaw2 = (subscription as any).current_period_end;
  const currentPeriodStartRaw2 = (subscription as any).current_period_start;
  const currentPeriodEnd = currentPeriodEndRaw2
    ? new Date(currentPeriodEndRaw2 * 1000)
    : new Date();
  const currentPeriodStart = currentPeriodStartRaw2
    ? new Date(currentPeriodStartRaw2 * 1000)
    : new Date();

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      stripeCurrentPeriodEnd: currentPeriodEnd,
      billingCycleStart: currentPeriodStart,
      billingCycleEnd: currentPeriodEnd,
    },
  });

  console.log('✅ Subscription updated');
}

// Helper: Handle subscription deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) return;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      planType: 'FREE',
      jobPostLimit: 1,
      canReplyToReviews: false,
    },
  });

  console.log('✅ Subscription cancelled');
}

// Helper: Handle invoice paid
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const rawSub = (invoice as any).subscription;
  const subscriptionId: string | undefined =
    typeof rawSub === 'string' ? rawSub : rawSub?.id;
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  // Create invoice record
  await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'paid',
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      invoicePdf: invoice.invoice_pdf || undefined,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });

  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      lastPaymentDate: new Date(),
      lastPaymentAmount: invoice.amount_paid / 100,
    },
  });

  console.log('✅ Invoice paid recorded');
}

// Helper: Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const rawSub = (invoice as any).subscription;
  const subscriptionId: string | undefined =
    typeof rawSub === 'string' ? rawSub : rawSub?.id;
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
    },
  });

  console.log('⚠️ Payment failed for subscription');
}

// Cancel subscription
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const company = await prisma.company.findUnique({
      where: { userId },
      include: { subscription: true },
    });

    if (!company || !company.subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    if (!company.subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel free plan',
      });
    }

    await stripe.subscriptions.cancel(
      company.subscription.stripeSubscriptionId
    );

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};

// Check if can post job
export const canPostJob = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const company = await prisma.company.findUnique({
      where: { userId },
      include: { subscription: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const subscription = company.subscription;
    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: {
          canPost: false,
          reason: 'No subscription found',
          remainingPosts: 0,
        },
      });
    }

    const activeJobs = await prisma.job.count({
      where: {
        companyId: company.id,
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });

    const canPost =
      subscription.jobPostLimit === -1 ||
      activeJobs < subscription.jobPostLimit;

    return res.status(200).json({
      success: true,
      data: {
        canPost,
        activeJobs,
        jobPostLimit: subscription.jobPostLimit,
        remainingPosts:
          subscription.jobPostLimit === -1
            ? -1
            : Math.max(0, subscription.jobPostLimit - activeJobs),
        planType: subscription.planType,
      },
    });
  } catch (error: any) {
    console.error('Error checking job post eligibility:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error.message,
    });
  }
};
