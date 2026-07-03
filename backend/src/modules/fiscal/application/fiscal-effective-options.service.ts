import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { readPosFiscalSettings } from '@modules/points-of-sale/domain/pos-fiscal-settings.types';
import { FiscalProfile } from '../domain/fiscal-profile.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { SiiEnvironment } from '../domain/fiscal.enums';
import {
  DEFAULT_SALE_DOCUMENT_KIND,
  SALE_DOCUMENT_KINDS,
  type SaleDocumentKind,
} from '../domain/sale-document-kind';
import { PosFolioAllocationService } from './pos-folio-allocation.service';

export type EffectiveDocumentOption = {
  kind: SaleDocumentKind;
  enabled: boolean;
  reason?: string;
  availableFolios?: number;
};

export type EffectiveDocumentOptionsResult = {
  options: EffectiveDocumentOption[];
  defaultKind: SaleDocumentKind;
};

const BOLETA_DTE_TYPE = 39;

@Injectable()
export class FiscalEffectiveOptionsService {
  constructor(
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(FiscalProfile)
    private readonly profileRepo: Repository<FiscalProfile>,
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    private readonly allocationService: PosFolioAllocationService,
  ) {}

  async resolveEffectiveDocumentOptions(
    companyId: string,
    posId: string,
  ): Promise<EffectiveDocumentOptionsResult> {
    const pos = await this.posRepo.findOne({
      where: { id: posId, companyId, deletedAt: IsNull() },
    });
    if (!pos) throw new NotFoundException('Punto de venta no encontrado');

    const fiscalSettings = readPosFiscalSettings(pos.settings);
    const profile = await this.profileRepo.findOne({ where: { companyId } });
    const productionEnabled = profile?.productionEnabled === true;

    const options: EffectiveDocumentOption[] = [];

    for (const kind of SALE_DOCUMENT_KINDS) {
      if (!fiscalSettings.allowedDocumentKinds.includes(kind)) {
        continue;
      }

      if (kind === 'TICKET') {
        options.push({ kind, enabled: true });
        continue;
      }

      if (kind === 'FACTURA') {
        options.push({ kind, enabled: false, reason: 'NO_IMPLEMENTADO' });
        continue;
      }

      if (kind === 'BOLETA') {
        options.push(
          await this.resolveDteOption(companyId, posId, 'BOLETA', BOLETA_DTE_TYPE, productionEnabled),
        );
        continue;
      }

      options.push({ kind, enabled: false, reason: 'NO_IMPLEMENTADO' });
    }

    let defaultKind = fiscalSettings.defaultDocumentKind;
    const defaultOption = options.find((o) => o.kind === defaultKind);
    if (!defaultOption?.enabled) {
      defaultKind =
        options.find((o) => o.enabled)?.kind ??
        options.find((o) => o.kind === 'TICKET')?.kind ??
        DEFAULT_SALE_DOCUMENT_KIND;
    }

    return { options, defaultKind };
  }

  async assertSaleDocumentKindAllowed(
    companyId: string,
    posId: string,
    kind: SaleDocumentKind,
  ): Promise<void> {
    if (kind === 'TICKET') return;
    const resolved = await this.resolveEffectiveDocumentOptions(companyId, posId);
    const option = resolved.options.find((o) => o.kind === kind);
    if (!option?.enabled) {
      const reason = option?.reason ?? 'NOT_ALLOWED';
      throw new ConflictException(`Documento ${kind} no disponible: ${reason}`);
    }
  }

  private async resolveDteOption(
    companyId: string,
    posId: string,
    kind: SaleDocumentKind,
    dteType: number,
    productionEnabled: boolean,
  ): Promise<EffectiveDocumentOption> {
    if (!productionEnabled) {
      return { kind, enabled: false, reason: 'NO_PRODUCTION' };
    }

    const caf = await this.cafRepo.findOne({
      where: {
        companyId,
        dteType,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      },
      order: { uploadedAt: 'DESC' },
    });
    if (!caf) {
      return { kind, enabled: false, reason: 'NO_CAF' };
    }

    const allocation = await this.allocationService.getActiveAllocation(posId, dteType);
    if (!allocation) {
      return { kind, enabled: false, reason: 'NO_ALLOCATION' };
    }

    const availableFolios = this.allocationService.getAvailableCount(allocation);
    if (availableFolios <= 0) {
      return { kind, enabled: false, reason: 'NO_FOLIOS', availableFolios: 0 };
    }

    return { kind, enabled: true, availableFolios };
  }
}
