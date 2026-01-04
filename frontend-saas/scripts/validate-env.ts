#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * This script validates that all required environment variables are properly configured
 * for the AI Application Writer payment system.
 *
 * Run this script before starting the development server or deploying to production.
 *
 * Usage:
 *   pnpm validate-env
 *   npm run validate-env
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  example?: string;
}

const ENV_CHECKS: EnvCheck[] = [
  // Database
  {
    key: 'POSTGRES_URL',
    required: true,
    description: 'PostgreSQL database connection URL',
    validator: (value) => value.startsWith('postgresql://'),
    example: 'postgresql://user:password@host:5432/dbname',
  },

  // Authentication
  {
    key: 'AUTH_SECRET',
    required: true,
    description: 'NextAuth secret key for session encryption',
    validator: (value) => value.length >= 32,
    example: 'Generate with: openssl rand -base64 32',
  },

  // Payment (Stripe)
  {
    key: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key for payment processing',
    validator: (value) => value.startsWith('sk_'),
    example: 'sk_test_... or sk_live_...',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe webhook secret for signature verification',
    validator: (value) => value.startsWith('whsec_'),
    example: 'whsec_...',
  },

  // Payment (PortOne)
  {
    key: 'NEXT_PUBLIC_PORTONE_STORE_ID',
    required: true,
    description: 'PortOne store ID for payment integration',
    validator: (value) => value.startsWith('store-'),
    example: 'store-...',
  },
  {
    key: 'PORTONE_WEBHOOK_SECRET',
    required: true,
    description: 'PortOne webhook secret for signature verification',
    validator: (value) => value.length > 0,
    example: 'Your PortOne webhook secret from dashboard',
  },

  // Backend API
  {
    key: 'NEXT_PUBLIC_BACKEND_URL',
    required: true,
    description: 'FastAPI backend URL for application writer',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    example: 'http://localhost:8000 or https://api.example.com',
  },
  {
    key: 'NEXT_PUBLIC_FASTAPI_URL',
    required: true,
    description: 'FastAPI URL for AI services',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    example: 'http://localhost:8000 or https://api.example.com',
  },

  // AI Services
  {
    key: 'ANTHROPIC_API_KEY',
    required: true,
    description: 'Anthropic (Claude) API key for AI writing',
    validator: (value) => value.startsWith('sk-ant-'),
    example: 'sk-ant-...',
  },
  {
    key: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for AI services',
    validator: (value) => value.startsWith('sk-'),
    example: 'sk-...',
  },

  // Supabase
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (value) => value.includes('.supabase.co'),
    example: 'https://your-project.supabase.co',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous (public) key',
    validator: (value) => value.length > 100,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    key: 'SUPABASE_SERVICE_KEY',
    required: true,
    description: 'Supabase service role (private) key',
    validator: (value) => value.length > 100,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },

  // Base URL
  {
    key: 'BASE_URL',
    required: true,
    description: 'Base URL for the application',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://'),
    example: 'http://localhost:3000 or https://app.example.com',
  },

  // Notification System - Kakao Alimtalk (Optional)
  {
    key: 'KAKAO_SENDER_KEY',
    required: false,
    description: 'Kakao Business Channel sender key for Alimtalk',
    validator: (value) => value.length > 0,
    example: 'Get from Kakao Business Channel settings',
  },
  {
    key: 'KAKAO_ALIMTALK_API_KEY',
    required: false,
    description: 'Kakao REST API key for Alimtalk',
    validator: (value) => value.length > 0,
    example: 'Get from Kakao Developers console',
  },

  // Notification System - Naver SENS (Optional)
  {
    key: 'NAVER_SENS_ACCESS_KEY',
    required: false,
    description: 'Naver Cloud Platform access key for SENS',
    validator: (value) => value.length > 0,
    example: 'Get from Naver Cloud Platform',
  },
  {
    key: 'NAVER_SENS_SECRET_KEY',
    required: false,
    description: 'Naver Cloud Platform secret key for SENS',
    validator: (value) => value.length > 0,
    example: 'Get from Naver Cloud Platform',
  },
  {
    key: 'NAVER_SENS_SERVICE_ID',
    required: false,
    description: 'Naver SENS service ID',
    validator: (value) => value.startsWith('ncp:sms:kr:'),
    example: 'ncp:sms:kr:123456789012:your-service-id',
  },
  {
    key: 'NAVER_SENS_FROM_NUMBER',
    required: false,
    description: 'Naver SENS sender phone number (with hyphens)',
    validator: (value) => /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/.test(value),
    example: '02-1234-5678 or 010-1234-5678',
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function loadEnvFile(): Record<string, string> {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return env;
  } catch (error) {
    console.error('❌ Failed to load .env file');
    console.error('   Make sure .env file exists in the project root');
    process.exit(1);
  }
}

function validateEnvVariables(): ValidationResult {
  const env = loadEnvFile();
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n🔍 Validating environment variables...\n');

  ENV_CHECKS.forEach((check) => {
    const value = env[check.key];
    const isSet = value !== undefined && value !== '';

    if (!isSet && check.required) {
      errors.push(`❌ ${check.key} is required but not set`);
      console.error(`❌ ${check.key}`);
      console.error(`   ${check.description}`);
      if (check.example) {
        console.error(`   Example: ${check.example}`);
      }
      console.error('');
    } else if (isSet) {
      if (check.validator && !check.validator(value)) {
        errors.push(`❌ ${check.key} has invalid format`);
        console.error(`❌ ${check.key} - Invalid format`);
        console.error(`   ${check.description}`);
        if (check.example) {
          console.error(`   Example: ${check.example}`);
        }
        console.error('');
      } else {
        console.log(`✅ ${check.key}`);
      }
    } else if (!check.required) {
      warnings.push(`⚠️  ${check.key} is not set (optional)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  console.log(`\n📦 Node.js version: ${nodeVersion}`);

  if (majorVersion < 18) {
    console.error('❌ Node.js version must be 18 or higher');
    console.error('   Current version:', nodeVersion);
    return false;
  }

  console.log('✅ Node.js version is compatible');
  return true;
}

function printSummary(result: ValidationResult) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  if (result.valid) {
    console.log('✅ All required environment variables are properly configured!');
  } else {
    console.log(`❌ ${result.errors.length} error(s) found`);
    console.log('\nErrors:');
    result.errors.forEach((error) => console.log(`  ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  ${result.warnings.length} warning(s):`);
    result.warnings.forEach((warning) => console.log(`  ${warning}`));
  }

  console.log('\n' + '='.repeat(60));

  if (!result.valid) {
    console.log('\n📚 Setup Guide:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Fill in all required environment variables');
    console.log('   3. Run this script again to validate');
    console.log('\n   See SETUP_GUIDE.md for detailed instructions');
    console.log('='.repeat(60) + '\n');
  }
}

// Main execution
function main() {
  console.log('🚀 Environment Variable Validation');
  console.log('='.repeat(60));

  const nodeVersionValid = checkNodeVersion();
  const envValidation = validateEnvVariables();

  printSummary(envValidation);

  if (!nodeVersionValid || !envValidation.valid) {
    process.exit(1);
  }

  console.log('✅ Environment is ready for development!\n');
  process.exit(0);
}

main();
