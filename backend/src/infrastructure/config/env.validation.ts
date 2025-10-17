import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional, validateSync, MinLength } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Environment Variables Validation Schema
 *
 * Validates all required environment variables at startup
 * Prevents the app from starting with missing or invalid configuration
 */
export class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX?: string = '/api/v1';

  // Database
  @IsString()
  @MinLength(10)
  DATABASE_URL: string;

  // JWT
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters for security' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '1d';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters for security' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  // Security
  @IsNumber()
  @IsOptional()
  BCRYPT_SALT_ROUNDS?: number = 12;

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // Payment - SePay (required in production)
  @IsString()
  @IsOptional()
  SEPAY_API_KEY?: string;

  @IsString()
  @IsOptional()
  BANK_ACCOUNT_NUMBER?: string;

  @IsString()
  @IsOptional()
  BANK_ACCOUNT_NAME?: string;

  @IsString()
  @IsOptional()
  BANK_CODE?: string;
}

/**
 * Validate environment variables
 * Called by ConfigModule during app initialization
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      return `  ❌ ${error.property}: ${constraints.join(', ')}`;
    }).join('\n');

    throw new Error(
      `\n⚠️  Environment validation failed:\n\n${errorMessages}\n\n` +
      `Please check your .env file and ensure all required variables are set correctly.\n` +
      `Refer to .env.example for the correct configuration.\n`
    );
  }

  // Production-specific validations
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (!validatedConfig.SEPAY_API_KEY) {
      console.warn('⚠️  WARNING: SEPAY_API_KEY is not set in production. Payment webhooks will not be authenticated.');
    }

    if (validatedConfig.CORS_ORIGIN && validatedConfig.CORS_ORIGIN.includes('localhost')) {
      console.warn('⚠️  WARNING: CORS_ORIGIN contains localhost in production environment!');
    }

    if (validatedConfig.JWT_SECRET.includes('CHANGE_THIS') || validatedConfig.JWT_SECRET.length < 32) {
      throw new Error('❌ JWT_SECRET must be changed and be at least 32 characters in production!');
    }

    if (validatedConfig.JWT_REFRESH_SECRET.includes('CHANGE_THIS') || validatedConfig.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('❌ JWT_REFRESH_SECRET must be changed and be at least 32 characters in production!');
    }
  }

  return validatedConfig;
}
