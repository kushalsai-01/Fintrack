/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled in the application
 */

export interface FeatureFlagsConfig {
  // Core Features (always enabled)
  transactions: boolean;
  budgets: boolean;
  categories: boolean;
  goals: boolean;
  analytics: boolean;
  
  // Premium Features (can be disabled)
  sharedBudgets: boolean;
  receiptOCR: boolean;
  bankIntegration: boolean;
  aiAdvisor: boolean;
  investmentTracking: boolean;
  debtManagement: boolean;
  
  // External Services (auto-detected)
  googleOAuth: boolean;
  githubOAuth: boolean;
  emailService: boolean;
  mlService: boolean;
  exchangeRates: boolean;
  
  // Experimental Features (disabled by default)
  shoppingInsights: boolean;
  pwaSupport: boolean;
  multiCurrency: boolean;
}

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlagsConfig = {
  // Core Features - always enabled
  transactions: true,
  budgets: true,
  categories: true,
  goals: true,
  analytics: true,
  
  // Premium Features - enabled by default
  sharedBudgets: true,
  receiptOCR: true,
  bankIntegration: false, // Requires Plaid credentials
  aiAdvisor: true,
  investmentTracking: true,
  debtManagement: true,
  
  // External Services - auto-detected on startup
  googleOAuth: false,
  githubOAuth: false,
  emailService: false,
  mlService: true,
  exchangeRates: false,
  
  // Experimental Features - disabled by default
  shoppingInsights: false, // Not yet implemented
  pwaSupport: false, // Not yet implemented
  multiCurrency: true, // Partially implemented
};

/**
 * Get feature flags from environment variables
 */
export function getFeatureFlagsFromEnv(): Partial<FeatureFlagsConfig> {
  const flags: Partial<FeatureFlagsConfig> = {};
  
  // Check for feature flag overrides in environment
  const envPrefix = 'FEATURE_';
  
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS)) {
    const envKey = `${envPrefix}${key.toUpperCase().replace(/([A-Z])/g, '_$1')}`;
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      flags[key as keyof FeatureFlagsConfig] = envValue.toLowerCase() === 'true';
    }
  }
  
  return flags;
}

/**
 * Merge default flags with environment overrides
 */
export function getFeatureFlags(): FeatureFlagsConfig {
  const envFlags = getFeatureFlagsFromEnv();
  return { ...DEFAULT_FEATURE_FLAGS, ...envFlags };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlagsConfig): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? false;
}

/**
 * Feature availability messages for disabled features
 */
export const FEATURE_UNAVAILABLE_MESSAGES: Record<string, string> = {
  shoppingInsights: 'Shopping Insights is coming soon! This feature is on our roadmap.',
  pwaSupport: 'Progressive Web App support is coming soon! Install from your browser.',
  bankIntegration: 'Bank integration requires Plaid credentials. Please configure in settings.',
  googleOAuth: 'Google sign-in is not configured. Contact your administrator.',
  githubOAuth: 'GitHub sign-in is not configured. Contact your administrator.',
  emailService: 'Email notifications are not configured. Some features may be limited.',
  mlService: 'AI features are temporarily unavailable. Please try again later.',
};
