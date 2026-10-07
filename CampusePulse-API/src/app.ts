import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initFirebase } from './database/firestore';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import publicRoutes from './routes/publicRoutes';
import eventRoutes from './routes/eventRoutes';
import programRoutes from './routes/programRoutes';
import registrationRoutes from './routes/registrationRoutes';
import scoreRoutes from './routes/scoreRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import reportRoutes from './routes/reportRoutes';
import userRoutes from './routes/userRoutes';
import auditRoutes from './routes/auditRoutes';

// Initialize Firebase
initFirebase();

export const app = express();

// Security middleware: Helmet with security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'sameorigin' },
  })
);

// CORS configuration allowing Firebase Web App, localhost, and other client origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any requesting origin (reflects origin header, compatible with credentials: true)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Explicit preflight handler
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Production HTTP request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test' && req.originalUrl !== '/api/health') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// General API rate limiter to protect against abuse and credential stuffing
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

app.use('/api', apiLimiter);

// Rate limiter for public endpoints (to prevent spam)
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 10000 : 120, // max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'College Event Management API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found`,
    code: 'NOT_FOUND',
  });
});

// Centralized error handler
app.use(errorHandler);
