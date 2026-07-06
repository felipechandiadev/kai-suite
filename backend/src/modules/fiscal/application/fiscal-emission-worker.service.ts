import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppConfigService } from '../../../config/config.service';
import { FiscalBoletaEmissionService } from './fiscal-boleta-emission.service';
import {
  FISCAL_EMISSION_PENDING_EVENT,
  type FiscalEmissionPendingEvent,
} from './fiscal-emission.events';

@Injectable()
export class FiscalEmissionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FiscalEmissionWorkerService.name);
  private interval?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly emissionService: FiscalBoletaEmissionService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.appConfig.fiscalEmission.workerIntervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log('Fiscal emission worker disabled (FISCAL_EMISSION_WORKER_INTERVAL_MS<=0)');
      return;
    }
    this.interval = setInterval(() => {
      void this.runBatch('cron').catch((e) =>
        this.logger.warn(
          `Fiscal emission worker batch failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }, intervalMs);
    this.logger.log(`Fiscal emission worker every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  @OnEvent(FISCAL_EMISSION_PENDING_EVENT)
  handlePendingEmission(event: FiscalEmissionPendingEvent): void {
    const emissionId = event?.emissionId?.trim();
    if (!emissionId) return;
    void this.emissionService.submitPendingToSii(emissionId).catch((e) =>
      this.logger.warn(
        `Immediate SII submit failed for ${emissionId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      ),
    );
  }

  private async runBatch(source: string): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.emissionService.recoverStaleSendingEmissions();
      const batchSize = this.appConfig.fiscalEmission.workerBatchSize;
      const ids = await this.emissionService.listPendingEmissionIdsForWorker(batchSize);
      if (!ids.length) return;
      this.logger.debug(`Worker ${source}: processing ${ids.length} emission(s)`);
      for (const id of ids) {
        await this.emissionService.submitPendingToSii(id);
      }
    } finally {
      this.processing = false;
    }
  }
}
