import * as Joi from 'joi';

/**
 * Configuration Schema for Flow Store Backend
 * Validates all environment variables with Joi
 */
export const configSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5030),
  API_PREFIX: Joi.string().default('api'),

  // Database
  DB_TYPE: Joi.string()
    .valid('postgres', 'mysql', 'sqlite')
    .default('postgres'),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_MAX_CONNECTIONS: Joi.number().default(10),
  DB_CONNECTION_TIMEOUT: Joi.number().default(60000),

  // Redis Cache
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default('flow:'),
  REDIS_TTL: Joi.number().default(3600), // 1 hour default
  REDIS_CLUSTER_MODE: Joi.boolean().default(false),

  // JWT Authentication
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(false),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_MAX_SIZE: Joi.string().default('20m'),
  LOG_MAX_FILES: Joi.string().default('14d'),

  // Metrics & Monitoring
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PREFIX: Joi.string().default('flow_backend'),
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),

  // External APIs
  GOLD_API_URL: Joi.string().allow('').optional(),
  GOLD_API_KEY: Joi.string().allow('').optional(),

  // Email (future use)
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().empty('').optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),

  // File Upload
  UPLOAD_DEST: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB

  // Multimedia Storage
  STORAGE_STRATEGY: Joi.string().valid('cloudflare', 'local').default('local'),
  R2_ACCOUNT_ID: Joi.string().allow('').optional(),
  R2_ENDPOINT: Joi.string().uri().allow('').optional(),
  R2_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  R2_BUCKET_NAME: Joi.string().allow('').optional(),
  R2_PUBLIC_URL: Joi.string().uri().allow('').optional(),
  LOCAL_STORAGE_PATH: Joi.string().default('./public/uploads'),
  MEDIA_MAX_FILE_SIZE: Joi.number().default(10485760),
  MEDIA_ALLOWED_MIME_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/webp,application/pdf',
  ),
  MEDIA_PUBLIC_BASE_PATH: Joi.string().default('/multimedia/files'),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Business Rules
  MAX_TRANSACTION_LINES: Joi.number().default(100),
  DEFAULT_CURRENCY: Joi.string().default('COP'),
  TIMEZONE: Joi.string().default('America/Bogota'),

  // Feature Flags
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_CORS: Joi.boolean().default(true),
  ENABLE_HEALTH_CHECK: Joi.boolean().default(true),
  ENABLE_METRICS: Joi.boolean().default(true),
  ENABLE_CACHE: Joi.boolean().default(true),
});
