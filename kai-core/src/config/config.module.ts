import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as path from 'path';
import { configSchema } from './config.schema';
import { AppConfigService } from './config.service';

/**
 * Configuration Module
 * Provides centralized, validated, and typed configuration management
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        // Load environment-specific file first
        path.resolve(
          __dirname,
          `../../.env.${process.env.NODE_ENV || 'development'}`,
        ),
        // Fallback to default .env file
        path.resolve(__dirname, '../../.env'),
      ],
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true, // Allow unknown keys for future extensibility
        abortEarly: false, // Show all validation errors
      },
      cache: true, // Cache parsed config for better performance
      expandVariables: true, // Allow variable expansion in .env files
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
