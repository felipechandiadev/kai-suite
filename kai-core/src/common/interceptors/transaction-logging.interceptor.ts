import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * INTERCEPTOR: Logging transparente de transacciones
 *
 * Responsabilidad: Capturar respuestas HTTP y loguear transacciones
 * sin afectar el flujo de negocio.
 *
 * Propósito: Observabilidad
 * - Loguear creación de transacciones exitosas
 * - Loguear errores
 * - Registrar timing de operaciones
 *
 * Aplicación:
 * - Se puede aplicar a nivel de Controller usando @UseInterceptors()
 * - O a nivel global en main.ts usando app.useGlobalInterceptors()
 *
 * Ejemplo de uso en Controller:
 * @UseInterceptors(TransactionLoggingInterceptor)
 * @Post()
 * async create(@Body() dto: CreateTransactionDto) { ... }
 */
@Injectable()
export class TransactionLoggingInterceptor implements NestInterceptor {
  private logger = new Logger(TransactionLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;

        // Si es una transacción (creada o actualizada), loguear detalles
        if (response && this.isTransaction(response)) {
          const tx = response;
          this.logger.log(
            `[${method}] ${url} - ` +
              `Transaction: ${tx.id} | ` +
              `Document: ${tx.documentNumber} | ` +
              `Type: ${tx.transactionType} | ` +
              `Amount: ${tx.total} | ` +
              `Duration: ${duration}ms`,
          );
        } else if (
          Array.isArray(response) &&
          response.length > 0 &&
          this.isTransaction(response[0])
        ) {
          // Si es un array de transacciones
          this.logger.log(
            `[${method}] ${url} - ` +
              `Returned ${response.length} transactions | ` +
              `Duration: ${duration}ms`,
          );
        }
      }),
    );
  }

  private isTransaction(obj: any): obj is Transaction {
    return (
      obj && 'id' in obj && 'documentNumber' in obj && 'transactionType' in obj
    );
  }
}
