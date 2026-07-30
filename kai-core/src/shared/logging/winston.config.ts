import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { AppConfigService } from '../../config/config.service';

/**
 * Configuración de Winston Logger
 */
export const createWinstonConfig = (configService: AppConfigService) => ({
  level: configService.app.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'kai-core',
    environment: configService.app.nodeEnv,
  },
  transports: [
    // Console transport para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),

    // File transport para errores
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: configService.app.logging.maxSize,
      maxFiles: configService.app.logging.maxFiles,
    }),

    // File transport para todos los logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: configService.app.logging.maxSize,
      maxFiles: configService.app.logging.maxFiles,
    }),

    // File transport específico para transacciones
    new DailyRotateFile({
      filename: 'logs/transactions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: configService.app.logging.maxSize,
      maxFiles: configService.app.logging.maxFiles,
    }),
  ],
});
