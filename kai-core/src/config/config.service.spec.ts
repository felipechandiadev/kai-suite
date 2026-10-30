import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';

/** Valores mínimos para que la prueba no dependa de un `.env.test` (ausente en el repo / CI). */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3000',
  DB_TYPE: 'postgres',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'test',
  DB_PASSWORD: 'test',
  DB_DATABASE: 'test',
  DB_SYNCHRONIZE: 'false',
  DB_LOGGING: 'false',
  DB_SSL: 'false',
  DB_MAX_CONNECTIONS: '10',
  DB_CONNECTION_TIMEOUT: '1000',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  REDIS_KEY_PREFIX: 'test:',
  REDIS_TTL: '60',
  REDIS_CLUSTER_MODE: 'false',
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh',
  JWT_REFRESH_EXPIRES_IN: '7d',
  MEDIA_ALLOWED_MIME_TYPES: 'image/png,image/jpeg',
  MEDIA_MAX_FILE_SIZE: '1048576',
  MEDIA_OPTIMIZE_MAX_INPUT_PX: '4096',
  MEDIA_PUBLIC_BASE_PATH: '/media',
  STORAGE_STRATEGY: 'local',
  LOCAL_STORAGE_PATH: './uploads',
  API_PREFIX: 'api',
  CORS_ORIGIN: '*',
  BCRYPT_ROUNDS: '4',
  RATE_LIMIT_MAX: '100',
  RATE_LIMIT_TTL: '60',
  LOG_LEVEL: 'error',
  LOG_MAX_FILES: '1',
  LOG_MAX_SIZE: '1m',
  MAX_TRANSACTION_LINES: '100',
  DEFAULT_CURRENCY: 'CLP',
  TIMEZONE: 'America/Santiago',
  METRICS_PREFIX: 'kai_',
  FISCAL_EMISSION_MAX_SUBMIT_ATTEMPTS: '3',
  FISCAL_EMISSION_STALE_SENDING_MS: '1000',
  FISCAL_EMISSION_SUBMIT_BACKOFF_BASE_MS: '1000',
  FISCAL_EMISSION_WORKER_BATCH_SIZE: '1',
  FISCAL_EMISSION_WORKER_INTERVAL_MS: '1000',
};

describe('AppConfigService', () => {
  let service: AppConfigService;
  const previousEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const [k, v] of Object.entries(TEST_ENV)) {
      previousEnv[k] = process.env[k];
      process.env[k] = v;
    }
  });

  afterAll(() => {
    for (const k of Object.keys(TEST_ENV)) {
      if (previousEnv[k] === undefined) delete process.env[k];
      else process.env[k] = previousEnv[k];
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validationSchema: undefined, // Skip validation for tests
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('App Configuration', () => {
    it('should return app config', () => {
      const appConfig = service.app;
      expect(appConfig).toBeDefined();
      expect(appConfig.nodeEnv).toBeDefined();
      expect(appConfig.port).toBeDefined();
      expect(typeof appConfig.port).toBe('number');
    });

    it('should return correct environment helpers', () => {
      expect(service.isDevelopment()).toBeDefined();
      expect(service.isProduction()).toBeDefined();
      expect(service.isTest()).toBeDefined();
    });
  });

  describe('Database Configuration', () => {
    it('should return database config', () => {
      const dbConfig = service.database;
      expect(dbConfig).toBeDefined();
      expect(dbConfig.type).toBeDefined();
      expect(dbConfig.host).toBeDefined();
      expect(dbConfig.port).toBeDefined();
      expect(typeof dbConfig.port).toBe('number');
    });
  });

  describe('Redis Configuration', () => {
    it('should return redis config', () => {
      const redisConfig = service.redis;
      expect(redisConfig).toBeDefined();
      expect(redisConfig.host).toBeDefined();
      expect(redisConfig.port).toBeDefined();
      expect(redisConfig.keyPrefix).toBeDefined();
    });
  });

  describe('JWT Configuration', () => {
    it('should return jwt config', () => {
      const jwtConfig = service.jwt;
      expect(jwtConfig).toBeDefined();
      expect(jwtConfig.secret).toBeDefined();
      expect(jwtConfig.expiresIn).toBeDefined();
    });
  });

  describe('Complete Configuration', () => {
    it('should return complete config object', () => {
      const config = service.config;
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.redis).toBeDefined();
      expect(config.jwt).toBeDefined();
    });
  });
});
