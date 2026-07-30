import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DiningBranchSettings } from '../domain/dining-branch-settings.entity';
import { DiningKitchenFireSequence } from '../domain/dining-kitchen-fire-sequence.entity';
import { DiningOrderSequence } from '../domain/dining-order-sequence.entity';
import { DiningOrderKind } from '../domain/dining.enums';
import {
  DEFAULT_DINING_RESET_TIME,
  DEFAULT_DINING_TIMEZONE,
  diningBusinessPeriodKey,
  formatDiningSequenceLabel,
  formatKitchenFireLabel,
  normalizeDiningResetTime,
  normalizeDiningTimezone,
} from './dining-business-period.util';

function normalizeCategoryIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export type DiningAllocatedNumber = {
  sequenceNumber: number;
  periodKey: string;
  displayLabel: string;
  timezone: string;
  resetTimeLocal: string;
};

@Injectable()
export class DiningOrderNumberService {
  private readonly logger = new Logger(DiningOrderNumberService.name);

  constructor(
    @InjectRepository(DiningBranchSettings)
    private readonly settingsRepository: Repository<DiningBranchSettings>,
    @InjectRepository(DiningOrderSequence)
    private readonly sequenceRepository: Repository<DiningOrderSequence>,
    @InjectRepository(DiningKitchenFireSequence)
    private readonly kitchenFireSequenceRepository: Repository<DiningKitchenFireSequence>,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateSettings(
    branchId: string,
    companyId: string,
  ): Promise<DiningBranchSettings> {
    const existing = await this.settingsRepository.findOne({
      where: { branchId, companyId },
    });
    if (existing) return existing;

    const row = this.settingsRepository.create({
      companyId,
      branchId,
      timezone: DEFAULT_DINING_TIMEZONE,
      resetTimeLocal: DEFAULT_DINING_RESET_TIME,
      allowWaiterOpenTable: true,
      allowPosOpenTable: true,
      posAccountsMenuCategoryIds: [],
    });
    try {
      await this.settingsRepository.insert(row);
      return (await this.settingsRepository.findOne({
        where: { branchId, companyId },
      }))!;
    } catch (e: any) {
      if (e?.code === '23505') {
        const again = await this.settingsRepository.findOne({
          where: { branchId, companyId },
        });
        if (again) return again;
      }
      throw e;
    }
  }

  async updateSettings(
    branchId: string,
    companyId: string,
    patch: {
      timezone?: string;
      resetTimeLocal?: string;
      allowWaiterOpenTable?: boolean;
      allowPosOpenTable?: boolean;
      posAccountsMenuCategoryIds?: string[];
    },
  ): Promise<DiningBranchSettings> {
    const settings = await this.getOrCreateSettings(branchId, companyId);
    if (patch.timezone !== undefined) {
      settings.timezone = normalizeDiningTimezone(patch.timezone);
    }
    if (patch.resetTimeLocal !== undefined) {
      settings.resetTimeLocal = normalizeDiningResetTime(patch.resetTimeLocal);
    }
    if (patch.allowWaiterOpenTable !== undefined) {
      settings.allowWaiterOpenTable = Boolean(patch.allowWaiterOpenTable);
    }
    if (patch.allowPosOpenTable !== undefined) {
      settings.allowPosOpenTable = Boolean(patch.allowPosOpenTable);
    }
    if (patch.posAccountsMenuCategoryIds !== undefined) {
      settings.posAccountsMenuCategoryIds = normalizeCategoryIdList(
        patch.posAccountsMenuCategoryIds,
      );
    }
    if (!settings.allowWaiterOpenTable && !settings.allowPosOpenTable) {
      throw new Error(
        'Debe habilitar al menos un canal para abrir cuentas de mesa (mesero o POS).',
      );
    }
    return this.settingsRepository.save(settings);
  }

  async allocateNext(
    branchId: string,
    companyId: string,
    kind: DiningOrderKind.COUNTER | DiningOrderKind.TAKEAWAY,
    manager?: EntityManager,
  ): Promise<DiningAllocatedNumber> {
    const settings = await this.getOrCreateSettings(branchId, companyId);
    const periodKey = diningBusinessPeriodKey(
      new Date(),
      settings.timezone,
      settings.resetTimeLocal,
    );

    const run = async (m: EntityManager) => {
      const n = await this.bumpSequence(m, branchId, companyId, kind, periodKey);
      return {
        sequenceNumber: n,
        periodKey,
        displayLabel: formatDiningSequenceLabel(kind, n),
        timezone: settings.timezone,
        resetTimeLocal: settings.resetTimeLocal,
      };
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((m) => run(m));
  }

  /** Correlativo diario de pedidos de cocina (mismo día operativo que cuentas). */
  async allocateNextKitchenFire(
    branchId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<DiningAllocatedNumber> {
    const settings = await this.getOrCreateSettings(branchId, companyId);
    const periodKey = diningBusinessPeriodKey(
      new Date(),
      settings.timezone,
      settings.resetTimeLocal,
    );

    const run = async (m: EntityManager) => {
      const n = await this.bumpKitchenFireSequence(
        m,
        branchId,
        companyId,
        periodKey,
      );
      return {
        sequenceNumber: n,
        periodKey,
        displayLabel: formatKitchenFireLabel(n),
        timezone: settings.timezone,
        resetTimeLocal: settings.resetTimeLocal,
      };
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((m) => run(m));
  }

  private async bumpSequence(
    m: EntityManager,
    branchId: string,
    companyId: string,
    kind: DiningOrderKind.COUNTER | DiningOrderKind.TAKEAWAY,
    periodKey: string,
  ): Promise<number> {
    const r = m.getRepository(DiningOrderSequence);

    for (let attempt = 0; attempt < 12; attempt++) {
      const existing = await r.findOne({
        where: { branchId, kind, periodKey },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        existing.lastNumber += 1;
        await r.save(existing);
        return existing.lastNumber;
      }

      const row = r.create({
        companyId,
        branchId,
        kind,
        periodKey,
        lastNumber: 1,
      });
      try {
        await r.insert(row);
        return 1;
      } catch (e: any) {
        if (e?.code === '23505') {
          this.logger.debug(
            `dining_order_sequences insert race (attempt ${attempt + 1}), retrying`,
          );
          continue;
        }
        throw e;
      }
    }

    throw new Error(
      `No se pudo generar correlativo dining ${kind} sucursal ${branchId} periodo ${periodKey}`,
    );
  }

  private async bumpKitchenFireSequence(
    m: EntityManager,
    branchId: string,
    companyId: string,
    periodKey: string,
  ): Promise<number> {
    const r = m.getRepository(DiningKitchenFireSequence);

    for (let attempt = 0; attempt < 12; attempt++) {
      const existing = await r.findOne({
        where: { branchId, periodKey },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        existing.lastNumber += 1;
        await r.save(existing);
        return existing.lastNumber;
      }

      const row = r.create({
        companyId,
        branchId,
        periodKey,
        lastNumber: 1,
      });
      try {
        await r.insert(row);
        return 1;
      } catch (e: any) {
        if (e?.code === '23505') {
          this.logger.debug(
            `dining_kitchen_fire_sequences insert race (attempt ${attempt + 1}), retrying`,
          );
          continue;
        }
        throw e;
      }
    }

    throw new Error(
      `No se pudo generar correlativo pedido cocina sucursal ${branchId} periodo ${periodKey}`,
    );
  }
}
