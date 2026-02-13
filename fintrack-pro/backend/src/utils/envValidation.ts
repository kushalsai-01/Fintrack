/**
 * Environment Variable Validation using Zod
 * Validates all required environment variables at startup
 */
import { z } from 'zod';
import { logger } from './logger.js';

// Define the schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),
  
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  
  // JWT (critical - must be set in production)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // URLs
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),
  
  // Email (optional but recommended)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // External APIs (optional)
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_DIR: z.string().default('uploads'),
  
  // Storage (optional)
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),
  SESSION_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup
 * @returns Parsed and validated environment variables
 * @throws Error if validation fails in production
 */
export function validateEnv(): Env {
  try {
    const validated = envSchema.parse(process.env);
    logger.info('✅ Environment variables validated successfully');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `  - ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      
      logger.error('❌ Environment validation failed:\n' + issues);
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed in production. Cannot start server.');
      } else {
        logger.warn('⚠️  Continuing in development mode with validation errors');
        // Return partial env for development
        return process.env as any;
      }
    }
    throw error;
  }
}

/**
 * Check if all optional third-party integrations are configured
 */
export function checkOptionalIntegrations(env: Env) {
  const integrations = {
    'Google OAuth': !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    'GitHub OAuth': !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    'Email (SMTP)': !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    'Plaid Banking': !!(env.PLAID_CLIENT_ID && env.PLAID_SECRET),
    'Exchange Rates': !!env.EXCHANGE_RATE_API_KEY,
    'Claude AI Advisor': !!env.CLAUDE_API_KEY,
    'AWS S3 Storage': !!(env.STORAGE_PROVIDER === 's3' && env.AWS_ACCESS_KEY_ID && env.S3_BUCKET),
    'Sentry Monitoring': !!env.SENTRY_DSN,
  };
  
  logger.info('📊 Optional Integrations Status:');
  Object.entries(integrations).forEach(([name, enabled]) => {
    logger.info(`  ${enabled ? '✅' : '❌'} ${name}: ${enabled ? 'Enabled' : 'Disabled'}`);
  });
  
  return integrations;
}
