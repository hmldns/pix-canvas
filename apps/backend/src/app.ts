import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import config from './config';

// Import routes
import userRoutes from './api/routes/user.routes';
import pixelRoutes from './api/routes/pixel.routes';

const app = express();

// Initialize Sentry if DSN is provided
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
  });
  
  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true, // Allow cookies
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/pixels', pixelRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
});

// Sentry error handler (must be before other error handlers)
if (config.sentryDsn) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message,
    statusCode,
    ...(config.debug && { stack: err.stack })
  });
});

export default app;