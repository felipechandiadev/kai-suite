import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LiteSeedService } from './lite-seed.service';

/**
 * Ensures minimal store data exists on every Lite sidecar boot (idempotent).
 * Tauri uses a fresh SQLite under Application Support — seed must not depend on UI.
 */
@Injectable()
export class LiteBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(LiteBootstrapService.name);

  constructor(private readonly seed: LiteSeedService) {}

  async onModuleInit(): Promise<void> {
    try {
      const result = await this.seed.runMinimalSeed();
      if (result.seeded) {
        this.logger.log(
          `Lite bootstrap seed: admin=${result.adminUserName} company=${result.companyId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Lite bootstrap seed failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
