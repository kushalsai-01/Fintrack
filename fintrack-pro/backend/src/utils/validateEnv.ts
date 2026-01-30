/**
 * Environment Validation Utility
 * Validates critical environment variables and configuration on startup
 */

import { config } from '../config/index.js';
import { logger } from './logger.js';
import axios from 'axios';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Placeholder values that should be replaced
 */
const PLACEHOLDER_VALUES = [
  'your-google-client-id',
  'your-google-client-secret',
  'your-github-client-id',
  'your-github-client-secret',
  'your-plaid-client-id',
  'your-plaid-secret',
  'your-email@gmail.com',
  'your-app-password',
  'your-exchange-rate-api-key',
  'your-super-secure-jwt-secret-key-change-in-production',
  'your-super-secure-refresh-secret-key-change-in-production',
];

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.some(placeholder => 
    value.toLowerCase().includes(placeholder.toLowerCase()) ||
    value.startsWith('your-')
  );
}

/**
 * Feature flags based on configuration availability
 */
export interface FeatureFlags {
  googleOAuth: boolean;
  githubOAuth: boolean;
  emailService: boolean;
  plaidIntegration: boolean;
  exchangeRates: boolean;
  mlService: boolean;
}

/**
 * Validate all environment variables and return feature flags
 */
export async function validateEnvironment(): Promise<{
  validation: ValidationResult;
  features: FeatureFlags;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ===============================
  // CRITICAL CHECKS (Will fail startup in production)
  // ===============================

  // JWT Secret validation
  if (config.jwt.secret === 'fallback-secret-key') {
    if (config.isProduction) {
      errors.push('CRITICAL: JWT_SECRET must be set in production (not using fallback)');
    } else {
      warnings.push('JWT_SECRET is using fallback value. Set a secure secret before production.');
    }
  }

  if (config.jwt.secret.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  if (config.jwt.refreshSecret === 'fallback-refresh-secret') {
    if (config.isProduction) {
      errors.push('CRITICAL: JWT_REFRESH_SECRET must be set in production');
    } else {
      warnings.push('JWT_REFRESH_SECRET is using fallback value.');
    }
  }

  // ===============================
  // FEATURE AVAILABILITY CHECKS
  // ===============================

  // Google OAuth
  const googleOAuthValid = !!(
    config.google.clientId && 
    config.google.clientSecret && 
    !isPlaceholder(config.google.clientId) && 
    !isPlaceholder(config.google.clientSecret)
  );

  if (!googleOAuthValid && config.google.clientId && isPlaceholder(config.google.clientId)) {
    warnings.push('Google OAuth: Using placeholder credentials. OAuth will be disabled.');
  }

  // GitHub OAuth
  const githubOAuthValid = !!(
    config.github.clientId && 
    config.github.clientSecret && 
    !isPlaceholder(config.github.clientId) && 
    !isPlaceholder(config.github.clientSecret)
  );

  if (!githubOAuthValid && config.github.clientId && isPlaceholder(config.github.clientId)) {
    warnings.push('GitHub OAuth: Using placeholder credentials. OAuth will be disabled.');
  }

  // Email Service
  const emailValid = !!(
    config.email.user && 
    config.email.pass && 
    !isPlaceholder(config.email.user) && 
    !isPlaceholder(config.email.pass)
  );

  if (!emailValid) {
    warnings.push('Email service: SMTP credentials not configured. Email features disabled.');
  }

  // Plaid Integration
  const plaidValid = !!(
    config.plaid.clientId && 
    config.plaid.secret && 
    !isPlaceholder(config.plaid.clientId) && 
    !isPlaceholder(config.plaid.secret)
  );

  if (!plaidValid) {
    warnings.push('Plaid: Credentials not configured. Bank integration disabled.');
  }

  // Exchange Rates
  const exchangeRateValid = !!(
    config.exchangeRate.apiKey && 
    !isPlaceholder(config.exchangeRate.apiKey)
  );

  if (!exchangeRateValid) {
    warnings.push('Exchange Rate API: Not configured. Using static rates.');
  }

  // ML Service (will be checked on startup)
  let mlServiceValid = true;

  const features: FeatureFlags = {
    googleOAuth: googleOAuthValid,
    githubOAuth: githubOAuthValid,
    emailService: emailValid,
    plaidIntegration: plaidValid,
    exchangeRates: exchangeRateValid,
    mlService: mlServiceValid,
  };

  return {
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings,
    },
    features,
  };
}

/**
 * Check ML service health
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const mlUrl = config.mlService.url || 'http://localhost:8000';
    const response = await axios.get(`${mlUrl}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Log validation results
 */
export function logValidationResults(
  validation: ValidationResult,
  features: FeatureFlags
): void {
  // Log errors
  if (validation.errors.length > 0) {
    logger.error('╔══════════════════════════════════════════════════════════════╗');
    logger.error('║           ❌ ENVIRONMENT VALIDATION FAILED                   ║');
    logger.error('╚══════════════════════════════════════════════════════════════╝');
    validation.errors.forEach(error => logger.error(`  ❌ ${error}`));
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    logger.warn('');
    logger.warn('⚠️  Configuration Warnings:');
    validation.warnings.forEach(warning => logger.warn(`   ⚠️  ${warning}`));
  }

  // Log feature status
  logger.info('');
  logger.info('📦 Feature Status:');
  logger.info(`   ${features.googleOAuth ? '✅' : '❌'} Google OAuth`);
  logger.info(`   ${features.githubOAuth ? '✅' : '❌'} GitHub OAuth`);
  logger.info(`   ${features.emailService ? '✅' : '❌'} Email Service`);
  logger.info(`   ${features.plaidIntegration ? '✅' : '❌'} Plaid Bank Integration`);
  logger.info(`   ${features.exchangeRates ? '✅' : '❌'} Live Exchange Rates`);
  logger.info(`   ${features.mlService ? '✅' : '⚠️'} ML Service`);
  logger.info('');
}

/**
 * Store feature flags for runtime access
 */
let _featureFlags: FeatureFlags | null = null;

export function setFeatureFlags(flags: FeatureFlags): void {
  _featureFlags = flags;
}

export function getFeatureFlags(): FeatureFlags {
  if (!_featureFlags) {
    // Return defaults if not initialized
    return {
      googleOAuth: false,
      githubOAuth: false,
      emailService: false,
      plaidIntegration: false,
      exchangeRates: false,
      mlService: true,
    };
  }
  return _featureFlags;
}
