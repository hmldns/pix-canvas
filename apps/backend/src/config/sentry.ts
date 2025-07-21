import * as Sentry from '@sentry/node';
import config from './index';

/**
 * Initialize Sentry error tracking for the backend service
 */
export function initializeSentry(): void {
  if (!config.sentryDsn) {
    console.warn('⚠️ SENTRY_DSN_BACKEND not provided - Sentry error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment,
    
    // Performance monitoring
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    
    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out WebSocket connection errors that are expected
      const error = hint.originalException as Error;
      if (error?.message?.includes('WebSocket connection')) {
        return null;
      }
      
      // Filter out MongoDB connection timeouts in development
      if (config.nodeEnv === 'development' && 
          error?.message?.includes('MongoNetworkTimeoutError')) {
        return null;
      }
      
      return event;
    },
    
    // Additional context
    initialScope: {
      tags: {
        service: 'backend',
        component: 'pix-canvas'
      },
      level: 'info'
    }
  });

  console.log('✅ Sentry error tracking initialized for backend');
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with additional context
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, userInfo?: Record<string, any>): void {
  Sentry.setUser({
    id: userId,
    ...userInfo
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000
  });
}