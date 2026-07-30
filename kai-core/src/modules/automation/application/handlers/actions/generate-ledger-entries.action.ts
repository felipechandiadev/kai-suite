import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';

@Injectable()
export class GenerateLedgerEntriesActionHandler {
  private readonly logger = new Logger(GenerateLedgerEntriesActionHandler.name);

  constructor(
    private readonly ledgerService: LedgerEntriesService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const tx = ctx.payload?.transaction;
    if (!tx?.id) return;

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const res = await this.ledgerService.generateEntriesForTransaction(
        tx,
        ctx.companyId,
        manager,
      );
      if (res.status === 'REJECTED') {
        const msg = res.errors[0]?.message || 'Unknown error';
        this.logger.error(
          `Ledger entries rejected tx=${tx.id} ruleId=${rule?.id}: ${msg}`,
        );
        throw new Error(msg);
      }
      this.logger.log(
        `Ledger entries generated tx=${tx.id} count=${res.entriesGenerated}`,
      );
    });
  }
}

