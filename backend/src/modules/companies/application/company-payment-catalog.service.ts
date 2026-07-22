import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
  buildDefaultCompanyCatalog,
  buildDefaultPosList,
  PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE,
  syncPosPaymentMethodsWithCatalog,
  validateCompanyPaymentMethods,
  validatePosPaymentMethods,
} from '@modules/payment-methods-config';
import {
  CompanyPaymentMethodEntity,
} from '../domain/company-payment-method.entity';
import {
  CompanyVoucherKindEntity,
  VoucherFaceValueMode,
} from '../domain/company-voucher-kind.entity';
import { PosPaymentMethodEntity } from '../domain/pos-payment-method.entity';
import {
  CompanyVoucherKind,
  sanitizeVoucherKindInput,
} from '../domain/company-voucher-kinds.types';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Company } from '../domain/company.entity';

@Injectable()
export class CompanyPaymentCatalogService {
  constructor(
    @InjectRepository(CompanyPaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<CompanyPaymentMethodEntity>,
    @InjectRepository(CompanyVoucherKindEntity)
    private readonly voucherKindRepo: Repository<CompanyVoucherKindEntity>,
    @InjectRepository(PosPaymentMethodEntity)
    private readonly posPaymentMethodRepo: Repository<PosPaymentMethodEntity>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  // ─── Voucher kinds ───────────────────────────────────────────────

  async listVoucherKinds(companyId: string): Promise<CompanyVoucherKind[]> {
    const rows = await this.voucherKindRepo.find({
      where: { companyId },
      order: { code: 'ASC' },
    });
    return rows.map((r) => this.mapVoucherKind(r));
  }

  async replaceVoucherKinds(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyVoucherKind[]> {
    if (!Array.isArray(raw)) {
      throw new BadRequestException('voucherKinds debe ser un arreglo');
    }
    const incoming: Array<
      Omit<CompanyVoucherKind, 'id' | 'code'> & { id?: string; code?: string }
    > = [];
    for (const item of raw) {
      try {
        const s = sanitizeVoucherKindInput(item);
        if (!s) continue;
        incoming.push(s);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Tipo de voucher inválido',
        );
      }
    }

    const existing = await this.voucherKindRepo.find({ where: { companyId } });
    const existingById = new Map(existing.map((e) => [e.id, e]));
    const keepIds = new Set<string>();

    for (const item of incoming) {
      if (item.id && existingById.has(item.id)) {
        const row = existingById.get(item.id)!;
        row.name = item.name;
        row.isActive = item.isActive;
        row.faceValueMode =
          item.faceValueMode === 'FIXED'
            ? VoucherFaceValueMode.FIXED
            : VoucherFaceValueMode.OPEN;
        row.defaultFaceValue =
          item.defaultFaceValue != null ? String(item.defaultFaceValue) : null;
        row.requireFaceValue =
          item.faceValueMode === 'OPEN' ? true : item.requireFaceValue;
        row.defaultIssuerName = item.defaultIssuerName ?? null;
        await this.voucherKindRepo.save(row);
        keepIds.add(row.id);
      } else {
        const code = await this.allocateVoucherKindCode(companyId);
        const row = this.voucherKindRepo.create({
          id: item.id && !existingById.has(item.id) ? item.id : randomUUID(),
          companyId,
          code,
          name: item.name,
          isActive: item.isActive,
          faceValueMode:
            item.faceValueMode === 'FIXED'
              ? VoucherFaceValueMode.FIXED
              : VoucherFaceValueMode.OPEN,
          defaultFaceValue:
            item.defaultFaceValue != null ? String(item.defaultFaceValue) : null,
          requireFaceValue:
            item.faceValueMode === 'OPEN' ? true : item.requireFaceValue,
          defaultIssuerName: item.defaultIssuerName ?? null,
        });
        await this.voucherKindRepo.save(row);
        keepIds.add(row.id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.id)) {
        await this.voucherKindRepo.softDelete(row.id);
      }
    }

    return this.listVoucherKinds(companyId);
  }

  async allocateVoucherKindCode(companyId: string): Promise<string> {
    // Incluye soft-deleted para no reutilizar códigos.
    const rows = await this.voucherKindRepo
      .createQueryBuilder('k')
      .withDeleted()
      .where('k.company_id = :companyId', { companyId })
      .andWhere(`k.code ~ '^VK[0-9]+$'`)
      .getMany();
    let max = 0;
    for (const r of rows) {
      const n = Number(String(r.code).replace(/^VK/, ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `VK${String(max + 1).padStart(5, '0')}`;
  }

  mapVoucherKind(row: CompanyVoucherKindEntity): CompanyVoucherKind {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
      faceValueMode:
        row.faceValueMode === VoucherFaceValueMode.FIXED ? 'FIXED' : 'OPEN',
      defaultFaceValue:
        row.defaultFaceValue != null
          ? Math.round(Number(row.defaultFaceValue))
          : null,
      requireFaceValue:
        row.faceValueMode === VoucherFaceValueMode.OPEN
          ? true
          : row.requireFaceValue === true,
      defaultIssuerName: row.defaultIssuerName ?? null,
    };
  }

  // ─── Company payment methods ─────────────────────────────────────

  async getPaymentMethods(
    companyId: string,
  ): Promise<CompanyPaymentMethodConfig[]> {
    let rows = await this.paymentMethodRepo.find({
      where: { companyId },
      order: { displayOrder: 'ASC' },
    });
    if (rows.length === 0) {
      const imported = await this.tryImportCompanyPaymentMethodsFromSettings(
        companyId,
      );
      if (imported) {
        rows = await this.paymentMethodRepo.find({
          where: { companyId },
          order: { displayOrder: 'ASC' },
        });
      }
    }
    if (rows.length === 0) {
      rows = await this.seedDefaultPaymentMethods(companyId);
    }
    return rows.map((r) => this.mapPaymentMethod(r));
  }

  /** Compat seeds / entornos que aún escriben settings.paymentMethods. */
  private async tryImportCompanyPaymentMethodsFromSettings(
    companyId: string,
  ): Promise<boolean> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const raw = company?.settings?.paymentMethods;
    if (!Array.isArray(raw) || raw.length === 0) return false;
    try {
      await this.replacePaymentMethods(companyId, raw);
      if (company) {
        const settings = { ...(company.settings ?? {}) };
        delete settings.paymentMethods;
        delete settings.voucherKinds;
        company.settings = settings;
        await this.companyRepo.save(company);
      }
      return true;
    } catch {
      return false;
    }
  }

  async replacePaymentMethods(
    companyId: string,
    list: unknown,
  ): Promise<CompanyPaymentMethodConfig[]> {
    let validated: CompanyPaymentMethodConfig[];
    try {
      validated = validateCompanyPaymentMethods(list);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Configuración inválida',
      );
    }

    for (const m of validated) {
      if (m.method === PaymentMethod.VOUCHER && m.voucherKindId) {
        const kind = await this.voucherKindRepo.findOne({
          where: {
            id: m.voucherKindId,
            companyId,
            deletedAt: IsNull(),
          },
        });
        if (!kind) {
          throw new BadRequestException(
            `Tipo de voucher no encontrado: ${m.voucherKindId}`,
          );
        }
      }
    }

    const existing = await this.paymentMethodRepo.find({ where: { companyId } });
    const existingById = new Map(existing.map((e) => [e.id, e]));
    const keepIds = new Set<string>();

    for (const m of validated) {
      const voucherKindId =
        m.method === PaymentMethod.VOUCHER ? m.voucherKindId ?? null : null;
      if (existingById.has(m.id)) {
        const row = existingById.get(m.id)!;
        row.method = m.method;
        row.alias = m.alias ?? null;
        row.displayOrder = m.displayOrder;
        row.isActive = m.isActive;
        row.requireReference = PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.has(
          m.method,
        )
          ? true
          : m.requireReference;
        row.bankAccountKey = m.bankAccountKey ?? null;
        row.feePercent = m.feePercent ?? null;
        row.metadata = m.metadata ?? null;
        row.voucherKindId = voucherKindId;
        await this.paymentMethodRepo.save(row);
        keepIds.add(row.id);
      } else {
        const row = this.paymentMethodRepo.create({
          id: m.id,
          companyId,
          method: m.method,
          alias: m.alias ?? null,
          displayOrder: m.displayOrder,
          isActive: m.isActive,
          requireReference: PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.has(
            m.method,
          )
            ? true
            : m.requireReference,
          bankAccountKey: m.bankAccountKey ?? null,
          feePercent: m.feePercent ?? null,
          metadata: m.metadata ?? null,
          voucherKindId,
        });
        await this.paymentMethodRepo.save(row);
        keepIds.add(row.id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.id)) {
        await this.posPaymentMethodRepo.delete({
          companyPaymentMethodId: row.id,
        });
        await this.paymentMethodRepo.softDelete(row.id);
      }
    }

    return this.getPaymentMethods(companyId);
  }

  async setPaymentMethodsActiveByMethod(
    companyId: string,
    method: PaymentMethod,
    isActive: boolean,
  ): Promise<string[]> {
    const rows = await this.paymentMethodRepo.find({
      where: { companyId, method },
    });
    const ids: string[] = [];
    for (const row of rows) {
      row.isActive = isActive;
      await this.paymentMethodRepo.save(row);
      ids.push(row.id);
    }
    return ids;
  }

  mapPaymentMethod(row: CompanyPaymentMethodEntity): CompanyPaymentMethodConfig {
    return {
      id: row.id,
      method: row.method,
      alias: row.alias ?? null,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
      requireReference: row.requireReference,
      bankAccountKey: row.bankAccountKey ?? null,
      feePercent: row.feePercent ?? null,
      metadata: (row.metadata as Record<string, any> | null) ?? null,
      voucherKindId: row.voucherKindId ?? null,
    };
  }

  private async seedDefaultPaymentMethods(
    companyId: string,
  ): Promise<CompanyPaymentMethodEntity[]> {
    const defaults = buildDefaultCompanyCatalog();
    const rows = defaults.map((m) =>
      this.paymentMethodRepo.create({
        id: m.id,
        companyId,
        method: m.method,
        alias: m.alias ?? null,
        displayOrder: m.displayOrder,
        isActive: m.isActive,
        requireReference: m.requireReference,
        bankAccountKey: m.bankAccountKey ?? null,
        feePercent: null,
        metadata: null,
        voucherKindId: null,
      }),
    );
    return this.paymentMethodRepo.save(rows);
  }

  // ─── POS payment methods ─────────────────────────────────────────

  async getPosPaymentMethods(
    posId: string,
    companyId: string,
  ): Promise<PosPaymentMethodConfig[]> {
    const catalog = await this.getPaymentMethods(companyId);
    let rows = await this.posPaymentMethodRepo.find({
      where: { pointOfSaleId: posId },
    });
    if (rows.length === 0) {
      await this.tryImportPosPaymentMethodsFromSettings(posId);
      rows = await this.posPaymentMethodRepo.find({
        where: { pointOfSaleId: posId },
      });
    }
    if (rows.length === 0) {
      const defaults = buildDefaultPosList(catalog);
      await this.persistPosPaymentMethods(posId, defaults);
      return defaults;
    }
    const mapped: PosPaymentMethodConfig[] = rows.map((r) => ({
      companyPaymentMethodId: r.companyPaymentMethodId,
      isEnabled: r.isEnabled,
      preloadOnPaymentScreen: r.preloadOnPaymentScreen,
      preloadOrder: r.preloadOrder ?? null,
      isDefaultForChange: r.isDefaultForChange,
      bankAccountKey: r.bankAccountKey ?? null,
      requireReference: r.requireReference ?? null,
    }));
    try {
      const validated = validatePosPaymentMethods(mapped, catalog);
      const synced = syncPosPaymentMethodsWithCatalog(catalog, validated);
      if (synced.length !== mapped.length) {
        await this.persistPosPaymentMethods(posId, synced);
      }
      return synced;
    } catch {
      const defaults = buildDefaultPosList(catalog);
      await this.persistPosPaymentMethods(posId, defaults);
      return defaults;
    }
  }

  async replacePosPaymentMethods(
    posId: string,
    companyId: string,
    list: unknown,
  ): Promise<PosPaymentMethodConfig[]> {
    const catalog = await this.getPaymentMethods(companyId);
    let validated: PosPaymentMethodConfig[];
    try {
      const incoming = Array.isArray(list) ? list : [];
      const synced = syncPosPaymentMethodsWithCatalog(catalog, incoming);
      validated = validatePosPaymentMethods(synced, catalog);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Configuración inválida',
      );
    }
    await this.persistPosPaymentMethods(posId, validated);
    return validated;
  }

  async applyPaymentMethodToggleOnAllPointsOfSale(
    companyId: string,
    companyPaymentMethodIds: Set<string>,
    isEnabled: boolean,
  ): Promise<void> {
    if (companyPaymentMethodIds.size === 0) return;
    const ids = Array.from(companyPaymentMethodIds);
    const posList = await this.posRepo.find({
      where: { companyId, deletedAt: IsNull() },
    });
    for (const pos of posList) {
      const rows = await this.posPaymentMethodRepo.find({
        where: {
          pointOfSaleId: pos.id,
          companyPaymentMethodId: In(ids),
        },
      });
      for (const row of rows) {
        row.isEnabled = isEnabled;
        await this.posPaymentMethodRepo.save(row);
      }
    }
  }

  async getVoucherKindById(
    companyId: string,
    kindId: string,
  ): Promise<CompanyVoucherKind | null> {
    const row = await this.voucherKindRepo.findOne({
      where: { id: kindId, companyId, deletedAt: IsNull() },
    });
    return row ? this.mapVoucherKind(row) : null;
  }

  async getPaymentMethodEntity(
    companyId: string,
    id: string,
  ): Promise<CompanyPaymentMethodEntity | null> {
    return this.paymentMethodRepo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
  }

  private async tryImportPosPaymentMethodsFromSettings(
    posId: string,
  ): Promise<void> {
    const pos = await this.posRepo.findOne({ where: { id: posId } });
    const raw = pos?.settings?.paymentMethods;
    if (!Array.isArray(raw) || raw.length === 0 || !pos) return;
    try {
      const mapped: PosPaymentMethodConfig[] = raw
        .map((r: Record<string, unknown>) => ({
          companyPaymentMethodId: String(r.companyPaymentMethodId ?? ''),
          isEnabled: r.isEnabled !== false,
          preloadOnPaymentScreen: r.preloadOnPaymentScreen === true,
          preloadOrder:
            r.preloadOrder == null ? null : Number(r.preloadOrder) || null,
          isDefaultForChange: r.isDefaultForChange === true,
          bankAccountKey:
            typeof r.bankAccountKey === 'string' ? r.bankAccountKey : null,
          requireReference:
            r.requireReference == null ? null : r.requireReference === true,
        }))
        .filter((r) => r.companyPaymentMethodId);
      if (mapped.length === 0) return;
      await this.persistPosPaymentMethods(posId, mapped);
      const settings = { ...(pos.settings ?? {}) };
      delete settings.paymentMethods;
      pos.settings = settings;
      await this.posRepo.save(pos);
    } catch {
      /* ignore */
    }
  }

  private async persistPosPaymentMethods(
    posId: string,
    list: PosPaymentMethodConfig[],
  ): Promise<void> {
    await this.posPaymentMethodRepo.delete({ pointOfSaleId: posId });
    if (list.length === 0) return;
    const rows = list.map((m) =>
      this.posPaymentMethodRepo.create({
        pointOfSaleId: posId,
        companyPaymentMethodId: m.companyPaymentMethodId,
        isEnabled: m.isEnabled,
        preloadOnPaymentScreen: m.preloadOnPaymentScreen,
        preloadOrder: m.preloadOrder ?? null,
        isDefaultForChange: m.isDefaultForChange,
        bankAccountKey: m.bankAccountKey ?? null,
        requireReference: m.requireReference ?? null,
      }),
    );
    await this.posPaymentMethodRepo.save(rows);
  }
}
