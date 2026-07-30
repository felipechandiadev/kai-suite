import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingEngineListener } from '@shared/listeners/accounting-engine.listener';
import { LedgerEntriesModule } from '@modules/ledger-entries/ledger-entries.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * SHARED MODULES: Listeners y Eventos
 *
 * Este módulo centraliza:
 * - Listeners (AccountingEngineListener)
 * - Eventos de dominio
 *
 * Propósito: Proporcionar listeners como inyectables globales
 * para que cualquier módulo pueda emitir eventos y los listeners
 * reaccionen automáticamente.
 */
@Module({
  imports: [
    LedgerEntriesModule,
    TypeOrmModule.forFeature([Transaction]),
  ],
  providers: [AccountingEngineListener],
  exports: [AccountingEngineListener],
})
export class EventsModule {}
