import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryCoverageCommune } from '../domain/e-shop-delivery-coverage-commune.entity';
import { EShopDeliverySettings } from '../domain/e-shop-delivery-settings.entity';
import { MAULE_COMMUNES_SEED, MAULE_REGION_CODE } from '../domain/delivery.types';

@Injectable()
export class DeliveryCoverageService {
  constructor(
    @InjectRepository(EShopDeliveryCoverageCommune)
    private readonly communeRepo: Repository<EShopDeliveryCoverageCommune>,
    @InjectRepository(EShopDeliverySettings)
    private readonly settingsRepo: Repository<EShopDeliverySettings>,
  ) {}

  /**
   * Idempotent: inserta comunas oficiales faltantes por `code`
   * (no solo cuando la tabla está vacía), para backfill de empresas
   * con catálogo parcial.
   */
  async ensureMauleSeed(companyId: string) {
    const existing = await this.communeRepo.find({
      where: { companyId },
      select: ['code'],
    });
    const existingCodes = new Set(existing.map((r) => r.code));
    for (const c of MAULE_COMMUNES_SEED) {
      if (existingCodes.has(c.code)) continue;
      await this.communeRepo.save(
        this.communeRepo.create({
          companyId,
          code: c.code,
          name: c.name,
          province: c.province,
          regionCode: MAULE_REGION_CODE,
          isEnabled: false,
        }),
      );
    }

    const settings = await this.settingsRepo.findOne({ where: { companyId } });
    if (!settings) {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          companyId,
          regionCode: MAULE_REGION_CODE,
          localDeliveryEnabled: false,
        }),
      );
    }
  }

  async listCommunes(companyId: string) {
    await this.ensureMauleSeed(companyId);
    return this.communeRepo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async setCommuneEnabled(companyId: string, communeId: string, isEnabled: boolean) {
    const row = await this.communeRepo.findOne({ where: { companyId, id: communeId } });
    if (!row) throw new Error('Comuna no encontrada');
    row.isEnabled = isEnabled;
    return this.communeRepo.save(row);
  }

  async getEnabledCommuneCodes(companyId: string): Promise<Set<string>> {
    const rows = await this.communeRepo.find({ where: { companyId, isEnabled: true } });
    return new Set(rows.map((r) => r.code));
  }

  async getSettings(companyId: string) {
    await this.ensureMauleSeed(companyId);
    return this.settingsRepo.findOneOrFail({ where: { companyId } });
  }

  async updateSettings(
    companyId: string,
    patch: Partial<{
      depotLat: number | null;
      depotLng: number | null;
      depotAddress: string | null;
      localDeliveryEnabled: boolean;
      osrmUrl: string | null;
    }>,
  ) {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, patch);
    return this.settingsRepo.save(settings);
  }
}
