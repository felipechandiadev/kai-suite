import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isoWeekPeriodKey } from '@modules/operational-expenses/application/recurring-operational-expense-schedule.util';
import { resolvePricingFloorNet } from './pricing-floor.util';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { PricingWeeklySnapshot } from '../domain/pricing-weekly-snapshot.entity';
import { PricingWeeklySnapshotLine } from '../domain/pricing-weekly-snapshot-line.entity';
import type {
  PricingApplyResultDto,
  PricingCalculateResultDto,
  PricingSnapshotDetailDto,
  PricingSnapshotSummaryDto,
} from '../domain/pricing.types';
import { PricingQueryService } from './pricing-query.service';
import {
  computePeNet,
  computeSuggestedNet,
  computeTargetNet,
  grossFromNet,
  isoWeekRange,
  previousIsoWeek,
  resolvePricingAlert,
} from './pricing-calculation.util';

export type PricingCalculateInput = {
  weekIso?: string;
  branchId?: string;
  categoryId?: string;
  priceListId: string;
  targetMarginPercent?: number;
  salesWindowWeekIso?: string;
};

@Injectable()
export class PricingService {
  constructor(
    private readonly queries: PricingQueryService,
    @InjectRepository(PricingWeeklySnapshot)
    private readonly snapshotRepo: Repository<PricingWeeklySnapshot>,
    @InjectRepository(PricingWeeklySnapshotLine)
    private readonly snapshotLineRepo: Repository<PricingWeeklySnapshotLine>,
    @InjectRepository(PriceListItem)
    private readonly priceItemRepo: Repository<PriceListItem>,
  ) {}

  async calculate(
    companyId: string,
    input: PricingCalculateInput,
  ): Promise<PricingCalculateResultDto> {
    const weekIso = input.weekIso?.trim() || isoWeekPeriodKey(new Date());
    const targetMarginPercent = Number(input.targetMarginPercent ?? 35);
    const salesWeekIso = input.salesWindowWeekIso?.trim() || previousIsoWeek(weekIso);
    const salesWindow = isoWeekRange(salesWeekIso);

    const gfPoolNet = await this.queries.sumStructureExpensesNet(
      companyId,
      salesWindow,
      input.branchId,
    );
    const companyNetSales = await this.queries.sumCompanyNetSales(
      companyId,
      salesWindow,
      input.branchId,
    );

    let entityNetSales = companyNetSales;
    if (input.categoryId) {
      entityNetSales = await this.queries.sumCategoryNetSales(
        companyId,
        salesWindow,
        input.categoryId,
        input.branchId,
      );
    }

    const share =
      companyNetSales > 0 ? Math.min(1, Math.max(0, entityNetSales / companyNetSales)) : 0;
    const gfQuota = Number((gfPoolNet * share).toFixed(2));

    const unitsByVariant = await this.queries.unitsSoldByVariant(companyId, salesWindow, {
      categoryId: input.categoryId,
      branchId: input.branchId,
    });
    const totalUnits = [...unitsByVariant.values()].reduce((s, q) => s + q, 0);
    const unitQuota = totalUnits > 0 ? Number((gfQuota / totalUnits).toFixed(2)) : 0;

    const variants = await this.queries.listVariantsForPricing(
      companyId,
      input.priceListId,
      input.categoryId,
    );

    const lines = variants.map(({ variant, product, listNet, listGross }) => {
      const floorNet = resolvePricingFloorNet(variant, product.productType);
      const unitsInWindow = unitsByVariant.get(variant.id) ?? 0;
      const peNet = computePeNet(floorNet, unitQuota);
      const targetNet = computeTargetNet(floorNet, targetMarginPercent);
      const suggestedNet = computeSuggestedNet(targetNet, peNet);
      const suggestedGross = grossFromNet(suggestedNet, listNet, listGross);
      const alert = resolvePricingAlert(floorNet, listNet, peNet);

      return {
        variantId: variant.id,
        productId: product.id,
        sku: variant.sku ?? null,
        productName: product.name,
        categoryId: product.categoryId ?? null,
        floorNet,
        listNet,
        listGross,
        unitQuota,
        peNet,
        targetNet,
        suggestedNet,
        suggestedGross,
        alert,
        unitsInWindow,
      };
    });

    return {
      weekIso,
      salesWindowFrom: salesWindow.dateFrom,
      salesWindowTo: salesWindow.dateTo,
      gfPoolNet,
      companyNetSales,
      entityNetSales,
      gfQuota,
      unitQuota,
      targetMarginPercent,
      lines,
      computedAt: new Date().toISOString(),
    };
  }

  async saveSnapshot(
    companyId: string,
    input: PricingCalculateInput,
  ): Promise<PricingSnapshotDetailDto> {
    const preview = await this.calculate(companyId, input);

    const snapshot = this.snapshotRepo.create({
      companyId,
      weekIso: preview.weekIso,
      branchId: input.branchId ?? null,
      categoryId: input.categoryId ?? null,
      priceListId: input.priceListId,
      targetMarginPercent: String(preview.targetMarginPercent),
      gfPoolNet: String(preview.gfPoolNet),
      companyNetSales: String(preview.companyNetSales),
      entityNetSales: String(preview.entityNetSales),
      gfQuota: String(preview.gfQuota),
      unitQuota: String(preview.unitQuota),
      salesWindowFrom: preview.salesWindowFrom,
      salesWindowTo: preview.salesWindowTo,
      status: 'DRAFT',
    });
    const saved = await this.snapshotRepo.save(snapshot);

    const lineEntities = preview.lines.map((line) =>
      this.snapshotLineRepo.create({
        companyId,
        snapshotId: saved.id,
        variantId: line.variantId,
        productId: line.productId,
        sku: line.sku,
        productName: line.productName,
        categoryId: line.categoryId,
        floorNet: String(line.floorNet),
        listNet: String(line.listNet),
        listGross: String(line.listGross),
        unitQuota: String(line.unitQuota),
        peNet: String(line.peNet),
        targetNet: String(line.targetNet),
        suggestedNet: String(line.suggestedNet),
        suggestedGross: String(line.suggestedGross),
        alert: line.alert,
        unitsInWindow: String(line.unitsInWindow),
      }),
    );
    await this.snapshotLineRepo.save(lineEntities);

    return this.getSnapshot(companyId, saved.id);
  }

  async listSnapshots(
    companyId: string,
    weekIso?: string,
  ): Promise<PricingSnapshotSummaryDto[]> {
    const where: Record<string, unknown> = { companyId };
    if (weekIso?.trim()) {
      where.weekIso = weekIso.trim();
    }
    const rows = await this.snapshotRepo.find({
      where: where as any,
      order: { createdAt: 'DESC' },
      relations: ['lines'],
    });
    return rows.map((s) => ({
      id: s.id,
      weekIso: s.weekIso,
      status: s.status,
      priceListId: s.priceListId ?? null,
      branchId: s.branchId ?? null,
      categoryId: s.categoryId ?? null,
      targetMarginPercent: Number(s.targetMarginPercent),
      gfPoolNet: Number(s.gfPoolNet),
      lineCount: s.lines?.length ?? 0,
      appliedAt: s.appliedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getSnapshot(companyId: string, id: string): Promise<PricingSnapshotDetailDto> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id, companyId },
      relations: ['lines'],
    });
    if (!snapshot) {
      throw new NotFoundException('Snapshot de pricing no encontrado');
    }
    const lines = (snapshot.lines ?? []).map((line) => ({
      variantId: line.variantId,
      productId: line.productId,
      sku: line.sku ?? null,
      productName: line.productName,
      categoryId: line.categoryId ?? null,
      floorNet: Number(line.floorNet),
      listNet: Number(line.listNet),
      listGross: Number(line.listGross),
      unitQuota: Number(line.unitQuota),
      peNet: Number(line.peNet),
      targetNet: Number(line.targetNet),
      suggestedNet: Number(line.suggestedNet),
      suggestedGross: Number(line.suggestedGross),
      alert: line.alert,
      unitsInWindow: Number(line.unitsInWindow),
    }));

    return {
      id: snapshot.id,
      weekIso: snapshot.weekIso,
      status: snapshot.status,
      priceListId: snapshot.priceListId ?? null,
      branchId: snapshot.branchId ?? null,
      categoryId: snapshot.categoryId ?? null,
      salesWindowFrom: snapshot.salesWindowFrom,
      salesWindowTo: snapshot.salesWindowTo,
      gfPoolNet: Number(snapshot.gfPoolNet),
      companyNetSales: Number(snapshot.companyNetSales),
      entityNetSales: Number(snapshot.entityNetSales),
      gfQuota: Number(snapshot.gfQuota),
      unitQuota: Number(snapshot.unitQuota),
      targetMarginPercent: Number(snapshot.targetMarginPercent),
      lines,
      computedAt: snapshot.createdAt.toISOString(),
      appliedAt: snapshot.appliedAt?.toISOString() ?? null,
    };
  }

  async applySnapshot(companyId: string, snapshotId: string): Promise<PricingApplyResultDto> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, companyId },
      relations: ['lines'],
    });
    if (!snapshot) {
      throw new NotFoundException('Snapshot de pricing no encontrado');
    }
    if (snapshot.status === 'APPLIED') {
      throw new BadRequestException('Este snapshot ya fue aplicado');
    }
    if (!snapshot.priceListId) {
      throw new BadRequestException('Snapshot sin lista de precios destino');
    }

    let appliedCount = 0;
    for (const line of snapshot.lines ?? []) {
      const existing = await this.priceItemRepo.findOne({
        where: {
          companyId,
          priceListId: snapshot.priceListId,
          productVariantId: line.variantId,
        } as any,
      });
      const suggestedNet = Number(line.suggestedNet);
      const suggestedGross = Number(line.suggestedGross);
      if (existing) {
        existing.netPrice = suggestedNet as any;
        existing.grossPrice = suggestedGross as any;
        await this.priceItemRepo.save(existing);
      } else {
        await this.priceItemRepo.save(
          this.priceItemRepo.create({
            companyId,
            priceListId: snapshot.priceListId,
            productId: line.productId,
            productVariantId: line.variantId,
            netPrice: suggestedNet as any,
            grossPrice: suggestedGross as any,
          }),
        );
      }
      appliedCount += 1;
    }

    snapshot.status = 'APPLIED';
    snapshot.appliedAt = new Date();
    await this.snapshotRepo.save(snapshot);

    return {
      snapshotId: snapshot.id,
      appliedCount,
      appliedAt: snapshot.appliedAt.toISOString(),
    };
  }
}
