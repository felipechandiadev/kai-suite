import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import { PointOfSaleFolioAllocation } from '../domain/point-of-sale-folio-allocation.entity';
import { FiscalProfile } from '../domain/fiscal-profile.entity';
import {
  FiscalCafPackageSource,
  FiscalCafPackageStatus,
  FiscalProfileStatus,
  SiiEnvironment,
} from '../domain/fiscal.enums';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { parseCafXml } from '../infrastructure/fiscal-xml.util';
import { isEmisorCompleteFromCompany } from '../domain/fiscal-emisor-from-company';
import {
  computeFolioRangeStats,
  fetchDistinctEmittedFoliosInRange,
} from './fiscal-folio-emission-stats';
import { Company } from '@modules/companies/domain/company.entity';
import type {
  FiscalCafPackageDetail,
  FiscalCafPackageListItem,
  FiscalCafSubPackItem,
} from './fiscal.types';

@Injectable()
export class FiscalCafPackageService {
  constructor(
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(PointOfSaleFolioAllocation)
    private readonly allocationRepo: Repository<PointOfSaleFolioAllocation>,
    @InjectRepository(FiscalDteEmission)
    private readonly emissionRepo: Repository<FiscalDteEmission>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(FiscalProfile)
    private readonly profileRepo: Repository<FiscalProfile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly crypto: FiscalCryptoService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async uploadPackage(
    companyId: string,
    file: Buffer,
    environment?: SiiEnvironment,
  ): Promise<FiscalCafPackageListItem> {
    const xml = file.toString('utf8');
    const parsed = parseCafXml(xml);
    const profile = await this.getOrCreateProfile(companyId);
    const env = environment ?? profile.environment;

    await this.cafRepo.update(
      {
        companyId,
        environment: env,
        dteType: parsed.dteType,
        status: FiscalCafPackageStatus.ACTIVE,
      },
      { status: FiscalCafPackageStatus.ARCHIVED, isActive: false },
    );

    const packageCode = await this.generatePackageCode(companyId, parsed.dteType);
    const enc = this.crypto.encrypt(Buffer.from(xml, 'utf8'));
    const saved = await this.cafRepo.save(
      this.cafRepo.create({
        companyId,
        packageCode,
        status: FiscalCafPackageStatus.ACTIVE,
        source: FiscalCafPackageSource.MANUAL_UPLOAD,
        dteType: parsed.dteType,
        rangeFrom: parsed.rangeFrom,
        rangeTo: parsed.rangeTo,
        nextFolio: parsed.rangeFrom,
        environment: env,
        isActive: true,
        encryptedCafXml: enc.data,
        cafIv: enc.iv,
      }),
    );

    await this.refreshProfileStatus(companyId);
    return this.buildPackageListItem(saved);
  }

  async listPackages(
    companyId: string,
    filters?: { dteType?: number; environment?: SiiEnvironment; status?: FiscalCafPackageStatus },
  ): Promise<FiscalCafPackageListItem[]> {
    const where: Record<string, unknown> = { companyId };
    if (filters?.dteType != null) where.dteType = filters.dteType;
    if (filters?.environment) where.environment = filters.environment;
    if (filters?.status) where.status = filters.status;

    const rows = await this.cafRepo.find({
      where,
      order: { uploadedAt: 'DESC' },
    });
    return Promise.all(rows.map((caf) => this.buildPackageListItem(caf)));
  }

  async getPackageDetail(companyId: string, cafId: string): Promise<FiscalCafPackageDetail> {
    const caf = await this.requirePackage(companyId, cafId);
    const base = await this.buildPackageListItem(caf);
    const allocations = await this.allocationRepo.find({
      where: { companyId, cafId },
      order: { rangeFrom: 'ASC' },
    });
    const posIds = [...new Set(allocations.map((a) => a.pointOfSaleId))];
    const posRows =
      posIds.length > 0
        ? await this.posRepo.find({ where: posIds.map((id) => ({ id })) })
        : [];
    const posById = new Map(posRows.map((p) => [p.id, p.name]));

    const subPacks: FiscalCafSubPackItem[] = allocations.map((a) => ({
      id: a.id,
      subPackCode: a.subPackCode,
      label: a.label ?? null,
      pointOfSaleId: a.pointOfSaleId,
      pointOfSaleName: posById.get(a.pointOfSaleId) ?? null,
      rangeFrom: a.rangeFrom,
      rangeTo: a.rangeTo,
      nextFolio: a.nextFolio,
      availableFolios: this.getAllocationAvailable(a),
      isActive: a.isActive,
    }));

    return { ...base, subPacks };
  }

  async archivePackage(companyId: string, cafId: string): Promise<FiscalCafPackageListItem> {
    const caf = await this.requirePackage(companyId, cafId);
    caf.status = FiscalCafPackageStatus.ARCHIVED;
    caf.isActive = false;
    const saved = await this.cafRepo.save(caf);
    return this.buildPackageListItem(saved);
  }

  async activatePackage(companyId: string, cafId: string): Promise<FiscalCafPackageListItem> {
    const caf = await this.requirePackage(companyId, cafId);
    await this.cafRepo.update(
      {
        companyId,
        environment: caf.environment,
        dteType: caf.dteType,
        status: FiscalCafPackageStatus.ACTIVE,
      },
      { status: FiscalCafPackageStatus.ARCHIVED, isActive: false },
    );
    caf.status = FiscalCafPackageStatus.ACTIVE;
    caf.isActive = true;
    const saved = await this.cafRepo.save(caf);
    return this.buildPackageListItem(saved);
  }

  async deletePackage(companyId: string, cafId: string): Promise<void> {
    const caf = await this.requirePackage(companyId, cafId);

    const emittedFolios = await fetchDistinctEmittedFoliosInRange(this.emissionRepo, {
      companyId: caf.companyId,
      dteType: caf.dteType,
      environment: caf.environment,
      rangeFrom: caf.rangeFrom,
      rangeTo: caf.rangeTo,
    });
    if (emittedFolios.size > 0) {
      throw new ConflictException(
        'No se puede eliminar: el paquete tiene emisiones registradas',
      );
    }

    const allocations = await this.allocationRepo.find({ where: { companyId, cafId } });
    const consumedAllocation = allocations.find((a) => a.nextFolio !== a.rangeFrom);
    if (consumedAllocation) {
      throw new ConflictException(
        'No se puede eliminar: hay folios consumidos en asignaciones POS',
      );
    }

    const wasActiveProduction =
      caf.status === FiscalCafPackageStatus.ACTIVE &&
      caf.environment === SiiEnvironment.PRODUCTION &&
      caf.isActive;

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PointOfSaleFolioAllocation, { companyId, cafId });
      await manager.delete(FiscalCaf, { id: cafId, companyId });
    });

    if (wasActiveProduction) {
      const remainingActive = await this.cafRepo.findOne({
        where: {
          companyId,
          dteType: caf.dteType,
          environment: SiiEnvironment.PRODUCTION,
          status: FiscalCafPackageStatus.ACTIVE,
          isActive: true,
        },
      });
      if (!remainingActive) {
        const profile = await this.profileRepo.findOne({ where: { companyId } });
        if (profile?.productionEnabled) {
          profile.productionEnabled = false;
          await this.profileRepo.save(profile);
        }
      }
    }
  }

  async updatePackageStatus(
    companyId: string,
    cafId: string,
    status: FiscalCafPackageStatus,
  ): Promise<FiscalCafPackageListItem> {
    if (status === FiscalCafPackageStatus.ACTIVE) {
      return this.activatePackage(companyId, cafId);
    }
    if (status === FiscalCafPackageStatus.ARCHIVED) {
      return this.archivePackage(companyId, cafId);
    }
    const caf = await this.requirePackage(companyId, cafId);
    caf.status = status;
    if (status === FiscalCafPackageStatus.EXHAUSTED) {
      caf.isActive = false;
    }
    const saved = await this.cafRepo.save(caf);
    return this.buildPackageListItem(saved);
  }

  async requirePackage(companyId: string, cafId: string): Promise<FiscalCaf> {
    const caf = await this.cafRepo.findOne({ where: { id: cafId, companyId } });
    if (!caf) throw new NotFoundException('Paquete CAF no encontrado');
    return caf;
  }

  private async buildPackageListItem(caf: FiscalCaf): Promise<FiscalCafPackageListItem> {
    const totalFolios = Math.max(0, caf.rangeTo - caf.rangeFrom + 1);
    const allocations = await this.allocationRepo.find({
      where: { companyId: caf.companyId, cafId: caf.id, isActive: true },
    });
    const assignedCount = allocations.reduce(
      (sum, a) => sum + Math.max(0, a.rangeTo - a.rangeFrom + 1),
      0,
    );
    const emittedFolios = await fetchDistinctEmittedFoliosInRange(this.emissionRepo, {
      companyId: caf.companyId,
      dteType: caf.dteType,
      environment: caf.environment,
      rangeFrom: caf.rangeFrom,
      rangeTo: caf.rangeTo,
    });
    const { emittedCount, available } = computeFolioRangeStats(
      caf.rangeFrom,
      caf.rangeTo,
      emittedFolios,
    );
    const subPackCount = allocations.length;

    return {
      id: caf.id,
      packageCode: caf.packageCode,
      label: caf.label ?? null,
      status: caf.status,
      source: caf.source,
      dteType: caf.dteType,
      rangeFrom: caf.rangeFrom,
      rangeTo: caf.rangeTo,
      nextFolio: caf.nextFolio,
      environment: caf.environment,
      isActive: caf.isActive,
      uploadedAt: caf.uploadedAt.toISOString(),
      stats: {
        totalFolios,
        assignedCount,
        emittedCount,
        available,
        subPackCount,
      },
    };
  }

  private getAllocationAvailable(allocation: PointOfSaleFolioAllocation): number {
    if (!allocation.isActive) return 0;
    return Math.max(0, allocation.rangeTo - allocation.nextFolio + 1);
  }

  private async generatePackageCode(companyId: string, dteType: number): Promise<string> {
    const prefix = `FOL-${dteType}-`;
    const existing = await this.cafRepo
      .createQueryBuilder('c')
      .select('c.package_code', 'packageCode')
      .where('c.company_id = :companyId', { companyId })
      .andWhere('c.package_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.uploaded_at', 'DESC')
      .getRawMany<{ packageCode: string }>();

    let seq = 1;
    const used = new Set(existing.map((r) => r.packageCode));
    while (used.has(`${prefix}${String(seq).padStart(4, '0')}`)) {
      seq += 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async getOrCreateProfile(companyId: string): Promise<FiscalProfile> {
    let profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile) {
      profile = this.profileRepo.create({
        companyId,
        environment: SiiEnvironment.CERTIFICATION,
        status: FiscalProfileStatus.DRAFT,
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  private async refreshProfileStatus(companyId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(companyId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) return;
    if (profile.status === FiscalProfileStatus.CERTIFIED || profile.productionEnabled) {
      return;
    }
    profile.status = isEmisorCompleteFromCompany(company)
      ? FiscalProfileStatus.READY
      : FiscalProfileStatus.DRAFT;
    await this.profileRepo.save(profile);
  }
}
