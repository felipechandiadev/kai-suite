import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { PointOfSaleFolioAllocation } from '../domain/point-of-sale-folio-allocation.entity';
import { SiiEnvironment } from '../domain/fiscal.enums';
import { PosFolioAllocationService } from './pos-folio-allocation.service';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { Company } from '@modules/companies/domain/company.entity';
import { companyToEmisorPreview } from '../domain/fiscal-emisor-from-company';

export type OfflineFiscalPackResponse = {
  allocationId: string;
  cafId: string;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  cafXml: string;
  emisor: ReturnType<typeof companyToEmisorPreview>;
  packExpiresAt: string;
};

export type OfflineFiscalPackQueueMeta = {
  allocationId: string;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
};

export type OfflineFiscalPackBundle = {
  current: OfflineFiscalPackResponse;
  next: OfflineFiscalPackResponse | null;
  queueMeta: OfflineFiscalPackQueueMeta[];
};

const BOLETA_DTE_TYPE = 39;

@Injectable()
export class OfflineFiscalPackService {
  constructor(
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly posFolioAllocation: PosFolioAllocationService,
    private readonly crypto: FiscalCryptoService,
  ) {}

  async getPackForPos(posId: string): Promise<OfflineFiscalPackBundle> {
    const pos = await this.posRepo.findOne({
      where: { id: posId, deletedAt: IsNull() },
    });
    if (!pos?.companyId) {
      throw new NotFoundException('Punto de venta no encontrado');
    }

    const ordered = await this.posFolioAllocation.listOrderedActiveForPos(
      posId,
      BOLETA_DTE_TYPE,
      SiiEnvironment.PRODUCTION,
    );
    if (ordered.length === 0) {
      throw new NotFoundException(
        'El POS no tiene sub-paquete de folios configurado',
      );
    }

    const currentAllocation = this.posFolioAllocation.pickCurrentFromOrdered(ordered);
    if (!currentAllocation) {
      throw new NotFoundException('Sin folios disponibles en el POS');
    }

    const nextAllocation = this.posFolioAllocation.pickNextStandbyAllocation(
      ordered,
      currentAllocation.id,
    );

    const company = await this.companyRepo.findOne({ where: { id: pos.companyId } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const emisor = companyToEmisorPreview(company);
    const packExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const current = await this.buildPackResponse(
      pos.companyId,
      currentAllocation,
      emisor,
      packExpiresAt,
    );
    const next = nextAllocation
      ? await this.buildPackResponse(pos.companyId, nextAllocation, emisor, packExpiresAt)
      : null;

    const queueMeta: OfflineFiscalPackQueueMeta[] = ordered.map((row) => ({
      allocationId: row.id,
      rangeFrom: row.rangeFrom,
      rangeTo: row.rangeTo,
      nextFolio: row.nextFolio,
    }));

    return { current, next, queueMeta };
  }

  private async buildPackResponse(
    companyId: string,
    allocation: PointOfSaleFolioAllocation,
    emisor: ReturnType<typeof companyToEmisorPreview>,
    packExpiresAt: string,
  ): Promise<OfflineFiscalPackResponse> {
    const caf = await this.cafRepo.findOne({
      where: { id: allocation.cafId, companyId },
    });
    if (!caf) {
      throw new BadRequestException('CAF del sub-paquete no encontrado');
    }

    const cafXml = this.crypto
      .decrypt(caf.encryptedCafXml, caf.cafIv)
      .toString('utf8');

    return {
      allocationId: allocation.id,
      cafId: allocation.cafId,
      dteType: allocation.dteType,
      rangeFrom: allocation.rangeFrom,
      rangeTo: allocation.rangeTo,
      nextFolio: allocation.nextFolio,
      cafXml,
      emisor,
      packExpiresAt,
    };
  }
}
