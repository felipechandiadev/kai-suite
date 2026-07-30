import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
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
