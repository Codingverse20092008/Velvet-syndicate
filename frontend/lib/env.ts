import { z } from 'zod';

const envSchema = z.object({
  // Database
  TURSO_DATABASE_URL: z.string().url(),
  TURSO_AUTH_TOKEN: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_TOKEN: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_VERSION: z.string().default('v1'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_AUTH_WINDOW: z.coerce.number().default(60),
  RATE_LIMIT_PRODUCTS_MAX: z.coerce.number().default(200),
  RATE_LIMIT_PRODUCTS_WINDOW: z.coerce.number().default(60),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@velvetsyndicate.com'),

  // Queue (Upstash/BullMQ)
  QUEUE_REDIS_URL: z.string().url().optional(),
  QUEUE_REDIS_TOKEN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_QUERY_LOGGING: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;