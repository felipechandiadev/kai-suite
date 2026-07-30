import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import {
  LedgerEntriesService,
  LedgerEntryGeneratorResponse,
} from '@modules/ledger-entries/application/ledger-entries.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

@Controller('ledger-entries')
export class LedgerEntriesController {
  constructor(private ledgerService: LedgerEntriesService) {}

  /**
   * Generar asientos para una transacción
   * POST /ledger-entries/generate
   */
  @Post('generate')
  async generateFromTransaction(
    @Body()
    payload: {
      transactionId: string;
      branchId: string;
      companyId: string;
    },
  ): Promise<LedgerEntryGeneratorResponse> {
    // TODO: Obtener la transacción de la DB
    // const transaction = await transactionRepo.findOne(payload.transactionId);
    // return this.ledgerService.generateEntriesForTransaction(transaction, payload.companyId);
    throw new Error('Not implemented - needs TransactionRepository injection');
  }

  /**
   * Listar asientos por transacción
   * GET /ledger-entries/transaction/:transactionId
   */
  @Get('transaction/:transactionId')
  async getByTransactionId(@Param('transactionId') transactionId: string) {
    // TODO: Implementar
    return { message: 'Not implemented' };
  }
}
