/**
 * Runtime Environment Variable Validation
 *
 * This module provides runtime validation for critical environment variables
 * to ensure the application has all necessary configuration before startup.
 */

interface EnvValidationError {
  variable: string;
  message: string;
}

/**
 * Validate required environment variables at runtime
 * @throws Error if any required environment variables are missing or invalid
 */
export function validateEnvironment(): void {
  const errors: EnvValidationError[] = [];

  // Database
  if (!process.env.POSTGRES_URL) {
    errors.push({
      variable: 'POSTGRES_URL',
      message: 'PostgreSQL connection URL is required',
    });
  } else if (!process.env.POSTGRES_URL.startsWith('postgresql://')) {
    errors.push({
      variable: 'POSTGRES_URL',
      message: 'POSTGRES_URL must start with postgresql://',
    });
  }

  // Authentication
  if (!process.env.AUTH_SECRET) {
    errors.push({
      variable: 'AUTH_SECRET',
      message: 'NextAuth secret is required for session encryption',
    });
  } else if (process.env.AUTH_SECRET.length < 32) {
    errors.push({
      variable: 'AUTH_SECRET',
      message: 'AUTH_SECRET must be at least 32 characters long',
    });
  }

  // Payment - Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push({
      variable: 'STRIPE_SECRET_KEY',
      message: 'Stripe secret key is required',
    });
  } else if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push({
      variable: 'STRIPE_SECRET_KEY',
      message: 'STRIPE_SECRET_KEY must start with sk_',
    });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push({
      variable: 'STRIPE_WEBHOOK_SECRET',
      message: 'Stripe webhook secret is required',
    });
  } else if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    errors.push({
      variable: 'STRIPE_WEBHOOK_SECRET',
      message: 'STRIPE_WEBHOOK_SECRET must start with whsec_',
    });
  }

  // Payment - PortOne
  if (!process.env.NEXT_PUBLIC_PORTONE_STORE_ID) {
    errors.push({
      variable: 'NEXT_PUBLIC_PORTONE_STORE_ID',
      message: 'PortOne store ID is required',
    });
  }

  if (!process.env.PORTONE_WEBHOOK_SECRET) {
    errors.push({
      variable: 'PORTONE_WEBHOOK_SECRET',
      message: 'PortOne webhook secret is required for signature verification',
    });
  }

  // Backend API
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    errors.push({
      variable: 'NEXT_PUBLIC_BACKEND_URL',
      message: 'Backend API URL is required',
    });
  } else if (
    !process.env.NEXT_PUBLIC_BACKEND_URL.startsWith('http://') &&
    !process.env.NEXT_PUBLIC_BACKEND_URL.startsWith('https://')
  ) {
    errors.push({
      variable: 'NEXT_PUBLIC_BACKEND_URL',
      message: 'NEXT_PUBLIC_BACKEND_URL must be a valid HTTP(S) URL',
    });
  }

  // AI Services
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push({
      variable: 'ANTHROPIC_API_KEY',
      message: 'Anthropic API key is required for AI writing',
    });
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    errors.push({
      variable: 'ANTHROPIC_API_KEY',
      message: 'ANTHROPIC_API_KEY must start with sk-ant-',
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    errors.push({
      variable: 'OPENAI_API_KEY',
      message: 'OpenAI API key is required',
    });
  } else if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    errors.push({
      variable: 'OPENAI_API_KEY',
      message: 'OPENAI_API_KEY must start with sk-',
    });
  }

  // Supabase
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
      message: 'Supabase project URL is required',
    });
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL.includes('.supabase.co')) {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
      message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL',
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      message: 'Supabase anonymous key is required',
    });
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    errors.push({
      variable: 'SUPABASE_SERVICE_KEY',
      message: 'Supabase service key is required',
    });
  }

  // Base URL
  if (!process.env.BASE_URL) {
    errors.push({
      variable: 'BASE_URL',
      message: 'Base URL is required',
    });
  } else if (
    !process.env.BASE_URL.startsWith('http://') &&
    !process.env.BASE_URL.startsWith('https://')
  ) {
    errors.push({
      variable: 'BASE_URL',
      message: 'BASE_URL must be a valid HTTP(S) URL',
    });
  }

  // If there are any errors, throw with detailed message
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment validation failed!',
      '',
      'Missing or invalid environment variables:',
      ...errors.map((err) => `  • ${err.variable}: ${err.message}`),
      '',
      'Please check your .env file and ensure all required variables are set.',
      'See SETUP_GUIDE.md for detailed configuration instructions.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log success in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment validation passed');
  }
}

/**
 * Validate environment variables and log warnings for missing optional variables
 */
export function validateEnvironmentWithWarnings(): void {
  try {
    validateEnvironment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Environment validation failed');
    process.exit(1);
  }

  // Check optional variables and warn if missing
  const warnings: string[] = [];

  if (!process.env.NEXT_PUBLIC_FASTAPI_URL) {
    warnings.push('NEXT_PUBLIC_FASTAPI_URL is not set (will use NEXT_PUBLIC_BACKEND_URL)');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional environment variables:');
    warnings.forEach((warning) => console.warn(`  • ${warning}`));
    console.warn('');
  }
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    nodeEnv: process.env.NODE_ENV || 'development',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    fastApiUrl: process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    portoneStoreId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  };
}
