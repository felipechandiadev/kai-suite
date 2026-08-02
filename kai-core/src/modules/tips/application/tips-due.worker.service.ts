import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TipsService } from './tips.service';

/**
 * Escanea tips tarjeta ACCRUED con dueAt vencido (Art. 64: 7 días hábiles).
 * Intervalo vía TIP_DUE_WORKER_INTERVAL_MS (default 6h; <=0 desactiva).
 */
@Injectable()
export class TipsDueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TipsDueWorkerService.name);
  private interval?: NodeJS.Timeout;
  private processing = false;

  constructor(private readonly tipsService: TipsService) {}

  onModuleInit(): void {
    const raw = process.env.TIP_DUE_WORKER_INTERVAL_MS;
    const intervalMs =
      raw != null && raw.trim() !== ''
        ? Number(raw)
        : 6 * 60 * 60 * 1000;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log('Tips due worker disabled (TIP_DUE_WORKER_INTERVAL_MS<=0)');
      return;
    }
    this.interval = setInterval(() => {
      void this.runBatch().catch((e) =>
        this.logger.warn(
          `Tips due worker failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, intervalMs);
    this.logger.log(`Tips due worker every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }

  private async runBatch(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const n = await this.tipsService.scanOverdueAcrossCompanies();
      if (n > 0) {
        this.logger.debug(`Tips due scan touched ${n} company bucket(s)`);
      }
    } finally {
      this.processing = false;
    }
  }
}
