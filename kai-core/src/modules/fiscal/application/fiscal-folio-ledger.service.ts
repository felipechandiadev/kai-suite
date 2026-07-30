import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import { PointOfSaleFolioAllocation } from '../domain/point-of-sale-folio-allocation.entity';
import type { FiscalPackLedgerSummary } from './fiscal.types';
import { SiiEnvironment } from '../domain/fiscal.enums';
import {
  computeFolioRangeStats,
  fetchDistinctEmittedFoliosInRange,
} from './fiscal-folio-emission-stats';

@Injectable()
export class FiscalFolioLedgerService {
  constructor(
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(PointOfSaleFolioAllocation)
    private readonly allocationRepo: Repository<PointOfSaleFolioAllocation>,
    @InjectRepository(FiscalDteEmission)
    private readonly emissionRepo: Repository<FiscalDteEmission>,
  ) {}

  async getPackLedgerSummary(companyId: string, cafId: string): Promise<FiscalPackLedgerSummary> {
    const caf = await this.cafRepo.findOne({ where: { id: cafId, companyId } });
    if (!caf) throw new NotFoundException('Paquete CAF no encontrado');
    return this.buildSummary({
      companyId,
      dteType: caf.dteType,
      environment: caf.environment,
      cafId,
      rangeFrom: caf.rangeFrom,
      rangeTo: caf.rangeTo,
      nextFolio: caf.nextFolio,
    });
  }

  async getSubPackLedgerSummary(
    companyId: string,
    allocationId: string,
  ): Promise<FiscalPackLedgerSummary> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, companyId },
    });
    if (!allocation) throw new NotFoundException('Sub-paquete no encontrado');
    return this.buildSummary({
      companyId,
      dteType: allocation.dteType,
      environment: allocation.environment,
      cafId: allocation.cafId,
      allocationId,
      pointOfSaleId: allocation.pointOfSaleId,
      rangeFrom: allocation.rangeFrom,
      rangeTo: allocation.rangeTo,
      nextFolio: allocation.nextFolio,
    });
  }

  private async buildSummary(params: {
    companyId: string;
    dteType: number;
    environment: SiiEnvironment;
    cafId: string;
    allocationId?: string;
    pointOfSaleId?: string;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
  }): Promise<FiscalPackLedgerSummary> {
    const {
      companyId,
      dteType,
      environment,
      cafId,
      allocationId,
      pointOfSaleId,
      rangeFrom,
      rangeTo,
      nextFolio,
    } = params;

    const emittedFolios = await fetchDistinctEmittedFoliosInRange(this.emissionRepo, {
      companyId,
      dteType,
      environment,
      rangeFrom,
      rangeTo,
      allocationId,
      pointOfSaleId,
    });
    const { total, emittedCount, available } = computeFolioRangeStats(
      rangeFrom,
      rangeTo,
      emittedFolios,
    );
    const freeRanges = this.computeFreeRanges(rangeFrom, rangeTo, emittedFolios);

    return {
      cafId,
      allocationId: allocationId ?? null,
      rangeFrom,
      rangeTo,
      nextFolio,
      total,
      emittedCount,
      available,
      freeRanges,
    };
  }

  private computeFreeRanges(
    rangeFrom: number,
    rangeTo: number,
    emitted: Set<number>,
  ): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    let start: number | null = null;

    for (let folio = rangeFrom; folio <= rangeTo; folio += 1) {
      if (!emitted.has(folio)) {
        if (start === null) start = folio;
      } else if (start !== null) {
        ranges.push({ from: start, to: folio - 1 });
        start = null;
      }
    }
    if (start !== null) {
      ranges.push({ from: start, to: rangeTo });
    }
    return ranges;
  }
}
