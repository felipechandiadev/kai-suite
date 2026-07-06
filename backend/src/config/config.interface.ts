/**
 * Typed Configuration Interfaces for Flow Store Backend
 * Provides type safety for all configuration values
 */

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number;
  clusterMode: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface R2StorageConfig {
  accountId?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicUrl?: string;
}

export interface LocalStorageConfig {
  path: string;
}

export interface StorageConfig {
  strategy: 'cloudflare' | 'local';
  maxFileSize: number;
  allowedMimeTypes: string[];
  publicBasePath: string;
  r2: R2StorageConfig;
  local: LocalStorageConfig;
}

export interface CorsConfig {
  origin: string;
  credentials: boolean;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  maxSize: string;
  maxFiles: string;
}

export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  rateLimitTtl: number;
  rateLimitMax: number;
}

export interface BusinessConfig {
  maxTransactionLines: number;
  defaultCurrency: string;
  timezone: string;
}

export interface FeatureFlags {
  enableSwagger: boolean;
  enableCors: boolean;
  enableHealthCheck: boolean;
  enableMetrics: boolean;
  enableCache: boolean;
}

export interface FiscalEmissionConfig {
  boletaAsyncEmit: boolean;
  workerIntervalMs: number;
  workerBatchSize: number;
  maxSubmitAttempts: number;
  staleSendingMs: number;
  submitBackoffBaseMs: number;
}

export interface AppConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  port: number;
  apiPrefix: string;
  cors: CorsConfig;
  logging: LoggingConfig;
  metrics: MetricsConfig;
  security: SecurityConfig;
  business: BusinessConfig;
  features: FeatureFlags;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  storage: StorageConfig;
  fiscalEmission: FiscalEmissionConfig;
}
