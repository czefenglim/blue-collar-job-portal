import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import onboardingRoutes from './routes/onboarding';
import jobRoutes from './routes/jobs';
import userRoutes from './routes/users';
import industryRoutes from './routes/industries';
import languageRoutes from './routes/language';
import employerRoutes from './routes/employer';
import adminRoutes from './routes/admin';
import reportRoutes from './routes/report';
import adminActionRoutes from './routes/adminAction';
import appealRoutes from './routes/appeal';
import notificationRoutes from './routes/notification';
import reviewRoutes from './routes/review';
import companyRoutes from './routes/company';
import jobAppealRoutes from './routes/jobAppeal';
import chatRoutes from './routes/chat';
import aiAssistantRoutes from './routes/aiAssistant';
import subscriptionRoutes from './routes/subscription';
import subscriptionPlanRoutes from './routes/subscriptionPlans';
import './jobs/notificationJobs';
import paymentRoutes from './routes/payment';
import path from 'path';

const app = express();

// Tell Express to trust the reverse proxy (ngrok, Heroku, Nginx, etc.)
app.set('trust proxy', 1);

app.use(
  '/api/subscription/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionRoutes
);

// ⭐️ CRITICAL: Body parser MUST come first ⭐️
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ⭐️ Debug middleware to verify body parsing ⭐️
app.use((req, res, next) => {
  console.log('🔍 DEBUG MIDDLEWARE:');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Content-Type:', req.headers['content-type']);
  console.log('  Body exists:', !!req.body);
  console.log('  Body:', req.body);
  next();
});

// Security middleware (AFTER body parser)
app.use(
  helmet({
    contentSecurityPolicy: false, // <- Allow inline JS
  })
);

app.use(
  cors({
    origin: '*', // For development - restrict in production
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin-actions', adminActionRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/job-appeals', jobAppealRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/payment', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'public')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('💥 GLOBAL ERROR:', err.stack);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Something went wrong!',
    });
  }
);

export default app;
