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

const app = express();

// Tell Express to trust the reverse proxy (ngrok, Heroku, Nginx, etc.)
app.set('trust proxy', 1); // 1 = trust first proxy

// ⭐️ CRITICAL: Body parser MUST come first ⭐️
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ⭐️ Add debug middleware to verify body parsing ⭐️
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
app.use(helmet());
app.use(
  cors({
    origin: '*', // allow all while developing
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
app.use('/api/language', languageRoutes); // Import language routes

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('💥 GLOBAL ERROR:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
);

export default app;
