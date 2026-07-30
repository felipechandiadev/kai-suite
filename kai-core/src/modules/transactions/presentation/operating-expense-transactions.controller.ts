import { Controller, Post, Body, Request } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TransactionType } from '../domain/transaction.entity';
import { CreateTransactionCommand } from '../application/commands/create-transaction.usecase';
import { CreateTransactionDto } from '../application/dto/create-transaction.dto';

/**
 * Controller para gastos operativos (transacciones de tipo OPERATING_EXPENSE)
 * Wrapper sobre CQRS que inyecta automáticamente el userId de la sesión
 */
@Controller('operating-expense-transactions')
export class OperatingExpenseTransactionsController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * POST /api/operating-expense-transactions
   * Crea un gasto operativo (transacción OPERATING_EXPENSE)
   * Automáticamente obtiene el userId del request
   */
  @Post()
  async create(@Body() data: CreateTransactionDto, @Request() req: any) {
    // Extract userId from request/session
    // Assuming the auth middleware attaches user to request
    const userId = req.user?.id || req.userId || data.userId;

    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    // Force OPERATING_EXPENSE type and build DTO instance
    const dto = Object.assign(new CreateTransactionDto(), {
      ...data,
      transactionType: TransactionType.OPERATING_EXPENSE,
      userId: userId,
    });

    return this.commandBus.execute(new CreateTransactionCommand(dto));
  }
}
