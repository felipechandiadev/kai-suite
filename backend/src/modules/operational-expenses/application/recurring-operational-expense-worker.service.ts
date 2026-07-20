import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RecurringOperationalExpensesService } from './recurring-operational-expenses.service';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Genera gastos operativos desde plantillas vencidas (`nextRunAt <= now`).
 * Intervalo: `RECURRING_OE_WORKER_INTERVAL_MS` (default 1h; ≤0 desactiva).
 */
@Injectable()
export class RecurringOperationalExpenseWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecurringOperationalExpenseWorkerService.name);
  private interval?: NodeJS.Timeout;
  private firstTimeout?: NodeJS.Timeout;
  private processing = false;

  constructor(private readonly recurring: RecurringOperationalExpensesService) {}

  onModuleInit() {
    const raw = process.env.RECURRING_OE_WORKER_INTERVAL_MS;
    const intervalMs =
      raw !== undefined && raw !== ''
        ? parseInt(raw, 10)
        : DEFAULT_INTERVAL_MS;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log(
        'Recurring OE worker disabled (RECURRING_OE_WORKER_INTERVAL_MS<=0 or invalid)',
      );
      return;
    }
    const firstDelay = Math.min(30_000, intervalMs);
    this.firstTimeout = setTimeout(() => {
      void this.tick().catch((e) =>
        this.logger.warn(
          `Initial recurring OE tick failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, firstDelay);
    this.interval = setInterval(() => {
      void this.tick().catch((e) =>
        this.logger.warn(
          `Recurring OE tick failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, intervalMs);
    this.logger.log(`Recurring OE worker every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    if (this.firstTimeout) {
      clearTimeout(this.firstTimeout);
      this.firstTimeout = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const result = await this.recurring.processDue(50);
      if (result.processed > 0) {
        this.logger.log(
          `Recurring OE: processed=${result.processed} generated=${result.generated}`,
        );
      }
    } finally {
      this.processing = false;
    }
  }
}
