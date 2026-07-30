import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { AppConfigService } from '../../config/config.service';
import { createWinstonConfig } from './winston.config';

/**
 * Servicio de Logging Avanzado
 *
 * Implementa logging estructurado con Winston para:
 * - Logs por niveles (error, warn, info, debug)
 * - Rotación automática de archivos
 * - Formato JSON estructurado
 * - Contexto de request/transaction
 * - Métricas integradas
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: AppConfigService) {
    this.logger = winston.createLogger(createWinstonConfig(configService));
  }

  /**
   * Log de error con contexto
   */
  error(message: any, context?: string, meta?: any) {
    const logEntry = {
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    this.logger.error(logEntry);
  }

  /**
   * Log de advertencia
   */
  warn(message: any, context?: string, meta?: any) {
    const logEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    this.logger.warn(logEntry);
  }

  /**
   * Log informativo
   */
  log(message: any, context?: string, meta?: any) {
    const logEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    this.logger.info(logEntry);
  }

  /**
   * Log de debug
   */
  debug(message: any, context?: string, meta?: any) {
    const logEntry = {
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    this.logger.debug(logEntry);
  }

  /**
   * Log específico para transacciones
   */
  logTransaction(
    action: string,
    transactionId: string,
    userId: string,
    meta?: any,
  ) {
    this.logger.info({
      level: 'info',
      message: `Transaction ${action}`,
      context: 'TRANSACTION',
      transactionId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  /**
   * Log para operaciones de negocio críticas
   */
  logBusinessOperation(
    operation: string,
    entityId: string,
    userId: string,
    result: 'success' | 'failure',
    meta?: any,
  ) {
    this.logger.info({
      level: 'info',
      message: `Business operation: ${operation}`,
      context: 'BUSINESS',
      operation,
      entityId,
      userId,
      result,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  /**
   * Log para métricas de performance
   */
  logPerformance(operation: string, duration: number, meta?: any) {
    this.logger.info({
      level: 'info',
      message: `Performance: ${operation}`,
      context: 'PERFORMANCE',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  /**
   * Log para errores de validación
   */
  logValidationError(entity: string, errors: any[], meta?: any) {
    this.logger.warn({
      level: 'warn',
      message: `Validation errors for ${entity}`,
      context: 'VALIDATION',
      entity,
      errors,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }
}
