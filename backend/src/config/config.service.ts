import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  JwtConfig,
  Config,
  StorageConfig,
  FiscalEmissionConfig,
} from './config.interface';

/**
 * Configuration Service
 * Provides typed access to all application configuration
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // Application Configuration
  get app(): AppConfig {
    return {
      nodeEnv: this.configService.get<string>('NODE_ENV')! as any,
      port: parseInt(this.configService.get<string>('PORT')!, 10),
      apiPrefix: this.configService.get<string>('API_PREFIX')!,
      cors: {
        origin: this.configService.get<string>('CORS_ORIGIN')!,
        credentials: this.envBool(this.configService.get('CORS_CREDENTIALS')),
      },
      logging: {
        level: this.configService.get<string>('LOG_LEVEL')! as any,
        maxSize: this.configService.get<string>('LOG_MAX_SIZE')!,
        maxFiles: this.configService.get<string>('LOG_MAX_FILES')!,
      },
      metrics: {
        enabled: this.envBool(this.configService.get('METRICS_ENABLED')),
        prefix: this.configService.get<string>('METRICS_PREFIX')!,
      },
      security: {
        bcryptRounds: parseInt(
          this.configService.get<string>('BCRYPT_ROUNDS')!,
          10,
        ),
        rateLimitTtl: parseInt(
          this.configService.get<string>('RATE_LIMIT_TTL')!,
          10,
        ),
        rateLimitMax: parseInt(
          this.configService.get<string>('RATE_LIMIT_MAX')!,
          10,
        ),
      },
      business: {
        maxTransactionLines: parseInt(
          this.configService.get<string>('MAX_TRANSACTION_LINES')!,
          10,
        ),
        defaultCurrency: this.configService.get<string>('DEFAULT_CURRENCY')!,
        timezone: this.configService.get<string>('TIMEZONE')!,
      },
      features: {
        enableSwagger: this.envBool(this.configService.get('ENABLE_SWAGGER')),
        enableCors: this.envBool(this.configService.get('ENABLE_CORS')),
        enableHealthCheck: this.envBool(
          this.configService.get('ENABLE_HEALTH_CHECK'),
        ),
        enableMetrics: this.envBool(this.configService.get('ENABLE_METRICS')),
        enableCache: this.envBool(this.configService.get('ENABLE_CACHE')),
      },
    };
  }

  // Database Configuration
  get database(): DatabaseConfig {
    return {
      type: this.configService.get<string>('DB_TYPE')! as any,
      host: this.configService.get<string>('DB_HOST')!,
      port: parseInt(this.configService.get<string>('DB_PORT')!, 10),
      username: this.configService.get<string>('DB_USERNAME')!,
      password: this.configService.get<string>('DB_PASSWORD')!,
      database: this.configService.get<string>('DB_DATABASE')!,
      synchronize: this.envBool(this.configService.get('DB_SYNCHRONIZE')),
      logging: this.envBool(this.configService.get('DB_LOGGING')),
      ssl: this.envBool(this.configService.get('DB_SSL')),
      maxConnections: parseInt(
        this.configService.get<string>('DB_MAX_CONNECTIONS')!,
        10,
      ),
      connectionTimeout: parseInt(
        this.configService.get<string>('DB_CONNECTION_TIMEOUT')!,
        10,
      ),
    };
  }

  // Redis Configuration
  get redis(): RedisConfig {
    return {
      host: this.configService.get<string>('REDIS_HOST')!,
      port: parseInt(this.configService.get<string>('REDIS_PORT')!, 10),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get<string>('REDIS_DB')!, 10),
      keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX')!,
      ttl: parseInt(this.configService.get<string>('REDIS_TTL')!, 10),
      clusterMode: this.envBool(this.configService.get('REDIS_CLUSTER_MODE')),
    };
  }

  // JWT Configuration
  get jwt(): JwtConfig {
    return {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN')!,
      refreshSecret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      refreshExpiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      )!,
    };
  }

  // Multimedia Storage Configuration
  get storage(): StorageConfig {
    const allowedMimeTypes = this.configService
      .get<string>('MEDIA_ALLOWED_MIME_TYPES')!
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return {
      strategy: this.configService.get<string>('STORAGE_STRATEGY')! as
        | 'cloudflare'
        | 'local',
      maxFileSize: parseInt(
        this.configService.get<string>('MEDIA_MAX_FILE_SIZE')!,
        10,
      ),
      allowedMimeTypes,
      publicBasePath: this.configService.get<string>('MEDIA_PUBLIC_BASE_PATH')!,
      r2: {
        accountId: this.configService.get<string>('R2_ACCOUNT_ID') || undefined,
        endpoint: this.configService.get<string>('R2_ENDPOINT') || undefined,
        accessKeyId:
          this.configService.get<string>('R2_ACCESS_KEY_ID') || undefined,
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') || undefined,
        bucketName: this.configService.get<string>('R2_BUCKET_NAME') || undefined,
        publicUrl: this.configService.get<string>('R2_PUBLIC_URL') || undefined,
      },
      local: {
        path: this.configService.get<string>('LOCAL_STORAGE_PATH')!,
      },
    };
  }

  get fiscalEmission(): FiscalEmissionConfig {
    return {
      boletaAsyncEmit: this.envBool(
        this.configService.get('FISCAL_BOLETA_ASYNC_EMIT'),
      ),
      workerIntervalMs: parseInt(
        this.configService.get<string>('FISCAL_EMISSION_WORKER_INTERVAL_MS')!,
        10,
      ),
      workerBatchSize: parseInt(
        this.configService.get<string>('FISCAL_EMISSION_WORKER_BATCH_SIZE')!,
        10,
      ),
      maxSubmitAttempts: parseInt(
        this.configService.get<string>('FISCAL_EMISSION_MAX_SUBMIT_ATTEMPTS')!,
        10,
      ),
      staleSendingMs: parseInt(
        this.configService.get<string>('FISCAL_EMISSION_STALE_SENDING_MS')!,
        10,
      ),
      submitBackoffBaseMs: parseInt(
        this.configService.get<string>('FISCAL_EMISSION_SUBMIT_BACKOFF_BASE_MS')!,
        10,
      ),
    };
  }

  // Complete Configuration Object
  get config(): Config {
    return {
      app: this.app,
      database: this.database,
      redis: this.redis,
      jwt: this.jwt,
      storage: this.storage,
      fiscalEmission: this.fiscalEmission,
    };
  }

  // Utility methods
  isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }

  /** Valores validados por Joi (boolean) o strings de `.env` / shell */
  private envBool(v: unknown): boolean {
    if (v === true) return true;
    if (v === false) return false;
    if (typeof v === 'string') {
      const t = v.trim().toLowerCase();
      return t === 'true' || t === '1' || t === 'yes';
    }
    if (typeof v === 'number') return v === 1;
    return false;
  }
}
