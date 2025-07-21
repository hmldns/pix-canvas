import * as Sentry from '@sentry/react';
import { config } from './config';

/**
 * Initialize Sentry error tracking for the frontend application
 */
export function initializeSentry(): void {
  // Priority: 1) Window object, 2) Environment variable
  const sentryDsn = config.sentry.dsn;
  
  if (!sentryDsn) {
    console.warn('⚠️ Sentry DSN not provided - Sentry error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: config.sentry.release,
    
    // Custom error filtering
    beforeSend(event, hint) {
      // Filter out WebSocket connection errors that are expected
      const error = hint.originalException as Error;
      if (error?.message?.includes('WebSocket connection') ||
          error?.message?.includes('Failed to fetch')) {
        return null;
      }
      
      // Filter out PixiJS warnings in development
      if (import.meta.env.MODE === 'development' && 
          error?.message?.includes('[PIXI]')) {
        return null;
      }
      
      return event;
    },
    
    // React-specific integrations
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        // Capture 10% of all sessions in production
        sessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
        // Capture 100% of sessions with an error
        errorSampleRate: 1.0,
      }),
    ],
    
    // Additional context
    initialScope: {
      tags: {
        service: 'frontend',
        component: 'pix-canvas'
      },
      level: 'info'
    }
  });

  console.log('✅ Sentry error tracking initialized for frontend');
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