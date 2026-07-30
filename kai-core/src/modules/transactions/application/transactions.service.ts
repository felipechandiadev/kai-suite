import { Injectable } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { Transaction } from '../domain/transaction.entity';
import { CreateTransactionDto } from '../application/dto/create-transaction.dto';
import { SearchTransactionsDto } from '../application/dto/search-transactions.dto';
import { CreateTransactionCommand } from '../application/commands/create-transaction.usecase';
import { CompletePaymentCommand } from '../application/commands/complete-payment.usecase';
import { SearchTransactionsQuery } from '../application/queries/search-transactions.query';
import { FindTransactionQuery } from '../application/queries/find-transaction.query';
import { GetTotalSalesForSessionQuery } from '../application/queries/get-total-sales-for-session.query';
import { GetMovementsForSessionQuery } from '../application/queries/get-movements-for-session.query';
import { ListJournalQuery } from '../application/queries/list-journal.query';

/**
 * ADAPTADOR TEMPORAL: TransactionsService
 *
 * Este adaptador mantiene la interfaz del TransactionsService legacy
 * pero internamente usa los handlers CQRS.
 *
 * PROPÓSITO:
 * - Mantener compatibilidad con módulos que aún no han migrado
 * - Permitir migración gradual del sistema
 * - Ser eliminado una vez que todos los módulos usen CQRS directamente
 *
 * TODO: Eliminar este adaptador cuando todos los módulos hayan migrado a CQRS
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    return this.commandBus.execute(new CreateTransactionCommand(dto));
  }

  async completePayment(paymentId: string, data: any): Promise<any> {
    return this.commandBus.execute(new CompletePaymentCommand(paymentId, data));
  }

  async search(dto: SearchTransactionsDto): Promise<any> {
    const transactionTypes =
      dto.types && String(dto.types).trim()
        ? String(dto.types)
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : undefined;
    return this.queryBus.execute(
      new SearchTransactionsQuery(
        dto.page,
        dto.limit || dto.pageSize,
        dto.type,
        dto.status,
        dto.paymentMethod,
        dto.branchId,
        dto.pointOfSaleId,
        dto.customerId,
        dto.supplierId,
        dto.dateFrom,
        dto.dateTo,
        dto.search,
        dto.bankAccountKey,
        dto.cashHubId,
        transactionTypes,
      ),
    );
  }

  async findOne(id: string): Promise<Transaction> {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }

  async getTotalSalesForSession(cashSessionId: string): Promise<number> {
    const result = await this.queryBus.execute(
      new GetTotalSalesForSessionQuery(cashSessionId),
    );
    return result.total;
  }

  async getMovementsForSession(cashSessionId: string): Promise<any[]> {
    const result = await this.queryBus.execute(
      new GetMovementsForSessionQuery(cashSessionId),
    );
    return Array.isArray(result) ? result : [];
  }

  async listJournal(dto: SearchTransactionsDto): Promise<any> {
    return this.queryBus.execute(
      new ListJournalQuery(
        dto.page || 1,
        dto.limit || dto.pageSize || 25,
        dto.type,
        dto.status,
        dto.dateFrom,
        dto.dateTo,
        dto.search,
      ),
    );
  }

  // Métodos legacy que aún no están migrados - lanzar error por ahora
  async updateTransaction(id: string, dto: any): Promise<Transaction> {
    throw new Error('Method not implemented. Use CQRS commands directly.');
  }

  async deleteTransaction(id: string): Promise<void> {
    throw new Error('Method not implemented. Use CQRS commands directly.');
  }

  async voidTransaction(id: string, reason: string): Promise<Transaction> {
    throw new Error('Method not implemented. Use CQRS commands directly.');
  }
}
