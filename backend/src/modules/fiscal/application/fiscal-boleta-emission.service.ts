import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { FiscalProfile } from '../domain/fiscal-profile.entity';
import { FiscalCertificate } from '../domain/fiscal-certificate.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import {
  FiscalDteEmissionStatus,
  SiiEnvironment,
} from '../domain/fiscal.enums';
import { emisorFromCompany } from '../domain/fiscal-emisor-from-company';
import { mapTransactionToSaleBoleta } from '../domain/map-transaction-to-sale-boleta';
import { buildSaleBoletaPrintPreview } from '../domain/build-sale-boleta-print-preview';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from '../infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from '../infrastructure/sii-boleta-rest.client';
import {
  buildEnvioBoletaXml,
  buildSaleDteBoletaXml,
} from '../infrastructure/boleta-envio.builder';
import {
  extractEstadoFromEnvioStatusResponse,
  extractTrackIdFromEnvioResponse,
} from '../infrastructure/fiscal-xml.util';
import type { FiscalBoletaPrintPreview } from '../domain/fiscal-boleta-print-preview';
import type { FiscalEmissionResult } from './fiscal-emission.types';
import type {
  FiscalEmissionListItem,
  FiscalEmissionsListResult,
} from './fiscal.types';
import { mapFiscalEmissionListItem } from './map-fiscal-emission-list-item';
import {
  isSuccessfulEnvioStatus,
  pollEnvioStatus,
  resolveInitialPollDelayMs,
  resolveSiiEnvioStatus,
} from './sii-envio-status.util';
import { FiscalXmlSchemaValidator } from '../infrastructure/fiscal-xml-schema.validator';
import {
  buildSignedEnvioBoleta,
  validateAndPostEnvioBoleta,
  withIso8859Declaration,
} from './send-signed-envio-boleta.util';
import { PosFolioAllocationService } from './pos-folio-allocation.service';
import { PointOfSaleFolioAllocation } from '../domain/point-of-sale-folio-allocation.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

@Injectable()
export class FiscalBoletaEmissionService {
  private readonly logger = new Logger(FiscalBoletaEmissionService.name);

  constructor(
    @InjectRepository(FiscalProfile)
    private readonly profileRepo: Repository<FiscalProfile>,
    @InjectRepository(FiscalCertificate)
    private readonly certRepo: Repository<FiscalCertificate>,
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(FiscalDteEmission)
    private readonly emissionRepo: Repository<FiscalDteEmission>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly crypto: FiscalCryptoService,
    private readonly auth: SiiBoletaAuthService,
    private readonly sii: SiiBoletaRestClient,
    private readonly schemaValidator: FiscalXmlSchemaValidator,
    private readonly posFolioAllocation: PosFolioAllocationService,
  ) {}

  async emitFromSale(
    companyId: string,
    transactionId: string,
    pointOfSaleId: string,
  ): Promise<FiscalEmissionResult> {
    const profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile?.productionEnabled) {
      return { status: 'SKIPPED' };
    }

    const existing = await this.emissionRepo.findOne({ where: { transactionId } });
    if (existing) {
      if (isSuccessfulEnvioStatus(existing.envioStatus)) {
        return this.resultFromExisting(companyId, existing);
      }
      if (existing.envioStatus === FiscalDteEmissionStatus.FAILED) {
        const reconciled = await this.reconcileFailedIfSiiAccepted(companyId, existing);
        if (reconciled) {
          return this.resultFromExisting(companyId, reconciled);
        }
        await this.emissionRepo.delete({ id: existing.id });
      } else {
        return this.resultFromExisting(companyId, existing);
      }
    }

    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }
    if (transaction.transactionType !== TransactionType.SALE) {
      return { status: 'SKIPPED' };
    }

    const lines = await this.lineRepo.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
    if (!lines.length) {
      return { status: 'SKIPPED', error: 'Venta sin líneas' };
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    let person: Person | null = null;
    if (transaction.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: transaction.customerId },
        relations: ['person'],
      });
      person = customer?.person ?? null;
    }

    const emisor = emisorFromCompany(company);
    const saleDoc = mapTransactionToSaleBoleta(lines, person);
    const issuedAt = (transaction.createdAt ?? new Date()).toISOString().slice(0, 10);

    const peeked = await this.peekPosFolio(pointOfSaleId);
    if (!peeked) {
      return { status: 'FAILED', error: 'No hay folios disponibles' };
    }

    const cafXml = await this.loadCafXmlById(peeked.cafId);
    const material = await this.loadPfxMaterial(companyId);
    const rutEnvia = this.resolveRutEnvia(material, emisor.rut);

    let folio = peeked.folio;
    let tedXml: string;
    let signedDte: string;
    let signedEnvio: string;
    try {
      const built = this.buildAndSignSaleBoleta(
        emisor,
        saleDoc,
        folio,
        cafXml,
        issuedAt,
        material,
        rutEnvia,
      );
      tedXml = built.tedXml;
      signedDte = built.signedDte;
      signedEnvio = built.signedEnvio;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al construir DTE';
      return { status: 'FAILED', error: message };
    }

    let trackId: string | null = null;
    let envioStatus = FiscalDteEmissionStatus.SENT;
    let errorMessage: string | undefined;
    let siiStatusRaw: string | undefined;
    let reservedCafId = peeked.cafId;
    let reservedAllocationId: string | null = null;
    try {
      const reserved = await this.posFolioAllocation.reserveFolio(pointOfSaleId, 39);
      folio = reserved.folio;
      reservedCafId = reserved.cafId;
      reservedAllocationId = reserved.allocationId;
      const reservedCafXml =
        reserved.cafId !== peeked.cafId
          ? await this.loadCafXmlById(reserved.cafId)
          : cafXml;
      if (folio !== peeked.folio || reserved.cafId !== peeked.cafId) {
        const rebuilt = this.buildAndSignSaleBoleta(
          emisor,
          saleDoc,
          folio,
          reservedCafXml,
          issuedAt,
          material,
          rutEnvia,
        );
        tedXml = rebuilt.tedXml;
        signedDte = rebuilt.signedDte;
        signedEnvio = rebuilt.signedEnvio;
      }

      const token = await this.obtainToken(SiiEnvironment.PRODUCTION, material);
      const result = await validateAndPostEnvioBoleta(this.schemaValidator, this.sii, {
        environment: SiiEnvironment.PRODUCTION,
        token,
        signedXml: signedEnvio,
        companyRut: emisor.rut,
        rutEnvia,
      });
      trackId = result.trackId;
      try {
        const polled = await pollEnvioStatus(
          () =>
            this.sii.getEnvioStatus(SiiEnvironment.PRODUCTION, token, emisor.rut, trackId!),
          { initialDelayMs: resolveInitialPollDelayMs(result.retryAfter) },
        );
        envioStatus = polled.envioStatus;
        siiStatusRaw = polled.raw;
        if (polled.rejectionMessage) {
          errorMessage = polled.rejectionMessage;
        }
      } catch (pollErr) {
        this.logger.warn(
          `Poll estado SII falló para venta ${transactionId}: ${
            pollErr instanceof Error ? pollErr.message : String(pollErr)
          }`,
        );
      }
    } catch (e) {
      envioStatus = FiscalDteEmissionStatus.FAILED;
      errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.warn(`SII envío falló para venta ${transactionId}: ${errorMessage}`);
    }

    const emission = await this.emissionRepo.save(
      this.emissionRepo.create({
        companyId,
        transactionId,
        pointOfSaleId,
        cafId: reservedCafId,
        allocationId: reservedAllocationId,
        dteType: 39,
        folio,
        environment: SiiEnvironment.PRODUCTION,
        receptorRut: saleDoc.receptor.rut,
        receptorName: saleDoc.receptor.name,
        trackId,
        envioStatus,
        tedXml,
        errorDetail:
          errorMessage != null
            ? { message: errorMessage, siiStatusRaw: siiStatusRaw ?? null }
            : siiStatusRaw
              ? { siiStatusRaw }
              : null,
        issuedAt,
      }),
    );

    if (isSuccessfulEnvioStatus(envioStatus)) {
      await this.transactionRepo.update(transactionId, {
        documentType: 'BOLETA',
        documentFolio: String(folio),
      });
    }

    const printPreview = buildSaleBoletaPrintPreview({
      company,
      doc: saleDoc,
      folio,
      issuedAt,
      tedXml,
      transactionDocumentNumber: transaction.documentNumber,
    });

    if (envioStatus === FiscalDteEmissionStatus.FAILED || envioStatus === FiscalDteEmissionStatus.RCH) {
      return {
        status: 'FAILED',
        folio,
        trackId,
        error: errorMessage,
        printPreview,
      };
    }

    return {
      status: 'SENT',
      folio: emission.folio,
      trackId: emission.trackId,
      printPreview,
    };
  }

  async refreshEmissionSiiStatus(
    companyId: string,
    emissionId: string,
  ): Promise<FiscalEmissionListItem> {
    const emission = await this.emissionRepo.findOne({
      where: { id: emissionId, companyId },
    });
    if (!emission) {
      throw new NotFoundException('Emisión no encontrada');
    }
    if (!emission.trackId?.trim()) {
      throw new BadRequestException('La emisión no tiene track ID del SII');
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const emisor = emisorFromCompany(company);
    const material = await this.loadPfxMaterial(companyId);
    const token = await this.obtainToken(emission.environment, material);
    const { estado, raw } = await this.sii.getEnvioStatus(
      emission.environment,
      token,
      emisor.rut,
      emission.trackId,
    );

    const resolved = resolveSiiEnvioStatus(raw);
    emission.envioStatus = resolved.envioStatus;
    if (resolved.envioStatus === FiscalDteEmissionStatus.RCH) {
      emission.errorDetail = {
        message: resolved.rejectionMessage ?? `SII rechazó el envío: ${estado}`,
        siiStatusRaw: raw,
      };
    } else if (resolved.envioStatus === FiscalDteEmissionStatus.EPR) {
      emission.errorDetail = { siiStatusRaw: raw };
    } else {
      emission.errorDetail = { siiStatusRaw: raw };
    }

    const saved = await this.emissionRepo.save(emission);
    return this.mapEmissionToListItem(saved);
  }

  private async mapEmissionToListItem(emission: FiscalDteEmission): Promise<FiscalEmissionListItem> {
    const tx = await this.transactionRepo.findOne({ where: { id: emission.transactionId } });
    let branchName: string | null = null;
    if (tx?.branchId) {
      const branch = await this.dataSource.getRepository(Branch).findOne({
        where: { id: tx.branchId },
      });
      branchName = branch?.name ?? null;
    }
    return mapFiscalEmissionListItem({ emission, transaction: tx, branchName });
  }

  async retryFromSale(
    companyId: string,
    transactionId: string,
    pointOfSaleId?: string,
  ): Promise<FiscalEmissionResult> {
    const existing = await this.emissionRepo.findOne({ where: { transactionId, companyId } });
    if (existing && isSuccessfulEnvioStatus(existing.envioStatus)) {
      return this.resultFromExisting(companyId, existing);
    }
    if (existing?.envioStatus === FiscalDteEmissionStatus.FAILED) {
      const reconciled = await this.reconcileFailedIfSiiAccepted(companyId, existing);
      if (reconciled) {
        return this.resultFromExisting(companyId, reconciled);
      }
      await this.emissionRepo.delete({ id: existing.id });
    }

    let resolvedPosId = pointOfSaleId?.trim() || existing?.pointOfSaleId?.trim() || '';
    if (!resolvedPosId) {
      const tx = await this.transactionRepo.findOne({ where: { id: transactionId, companyId } });
      resolvedPosId = tx?.pointOfSaleId?.trim() ?? '';
    }
    if (!resolvedPosId) {
      throw new BadRequestException('pointOfSaleId es requerido para reintentar emisión');
    }
    return this.emitFromSale(companyId, transactionId, resolvedPosId);
  }

  async listEmissionsForCompany(
    companyId: string,
    query: {
      limit?: number;
      offset?: number;
      envioStatus?: FiscalDteEmissionStatus;
      from?: string;
      to?: string;
      environment?: SiiEnvironment;
      folio?: number;
      cafId?: string;
      allocationId?: string;
      folioFrom?: number;
      folioTo?: number;
      pointOfSaleId?: string;
    } = {},
  ): Promise<FiscalEmissionsListResult> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const environment = query.environment ?? SiiEnvironment.PRODUCTION;

    const qb = this.emissionRepo
      .createQueryBuilder('e')
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.environment = :environment', { environment });

    if (query.envioStatus) {
      qb.andWhere('e.envio_status = :envioStatus', { envioStatus: query.envioStatus });
    }
    if (query.from?.trim()) {
      qb.andWhere('e.issued_at >= :from', { from: query.from.trim() });
    }
    if (query.to?.trim()) {
      qb.andWhere('e.issued_at <= :to', { to: query.to.trim() });
    }
    if (query.folio != null && Number.isFinite(query.folio)) {
      qb.andWhere('e.folio = :folio', { folio: query.folio });
    }
    if (query.cafId?.trim()) {
      qb.andWhere('e.caf_id = :cafId', { cafId: query.cafId.trim() });
    }
    if (query.allocationId?.trim()) {
      qb.andWhere('e.allocation_id = :allocationId', { allocationId: query.allocationId.trim() });
    }
    if (query.folioFrom != null && Number.isFinite(query.folioFrom)) {
      qb.andWhere('e.folio >= :folioFrom', { folioFrom: query.folioFrom });
    }
    if (query.folioTo != null && Number.isFinite(query.folioTo)) {
      qb.andWhere('e.folio <= :folioTo', { folioTo: query.folioTo });
    }
    if (query.pointOfSaleId?.trim()) {
      qb.andWhere('e.point_of_sale_id = :pointOfSaleId', {
        pointOfSaleId: query.pointOfSaleId.trim(),
      });
    }

    const total = await qb.getCount();

    const rows = await qb
      .orderBy('e.folio', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const txIds = [...new Set(rows.map((r) => r.transactionId))];
    const transactions =
      txIds.length > 0
        ? await this.transactionRepo.find({ where: txIds.map((id) => ({ id })) })
        : [];
    const txById = new Map(transactions.map((t) => [t.id, t]));

    const branchIds = [
      ...new Set(
        transactions.map((t) => t.branchId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const branches =
      branchIds.length > 0
        ? await this.dataSource.getRepository(Branch).find({ where: branchIds.map((id) => ({ id })) })
        : [];
    const branchById = new Map(branches.map((b) => [b.id, b.name]));

    const cafIds = [...new Set(rows.map((r) => r.cafId).filter((id): id is string => Boolean(id)))];
    const allocationIds = [
      ...new Set(rows.map((r) => r.allocationId).filter((id): id is string => Boolean(id))),
    ];
    const posIds = [
      ...new Set(rows.map((r) => r.pointOfSaleId).filter((id): id is string => Boolean(id))),
    ];

    const cafs =
      cafIds.length > 0
        ? await this.cafRepo.find({ where: cafIds.map((id) => ({ id })) })
        : [];
    const cafById = new Map(cafs.map((c) => [c.id, c]));

    const allocations =
      allocationIds.length > 0
        ? await this.dataSource.getRepository(PointOfSaleFolioAllocation).find({
            where: allocationIds.map((id) => ({ id })),
          })
        : [];
    const allocById = new Map(allocations.map((a) => [a.id, a]));

    const posRows =
      posIds.length > 0
        ? await this.dataSource.getRepository(PointOfSale).find({ where: posIds.map((id) => ({ id })) })
        : [];
    const posById = new Map(posRows.map((p) => [p.id, p.name]));

    const items: FiscalEmissionListItem[] = rows.map((e) => {
      const tx = txById.get(e.transactionId);
      const branchName = tx?.branchId ? branchById.get(tx.branchId) ?? null : null;
      const caf = e.cafId ? cafById.get(e.cafId) : undefined;
      const alloc = e.allocationId ? allocById.get(e.allocationId) : undefined;
      const posName = e.pointOfSaleId ? posById.get(e.pointOfSaleId) ?? null : null;
      return mapFiscalEmissionListItem({
        emission: e,
        transaction: tx,
        branchName,
        packageCode: caf?.packageCode ?? null,
        subPackCode: alloc?.subPackCode ?? null,
        pointOfSaleName: posName,
      });
    });

    return { items, total };
  }

  async getPrintPreviewForTransaction(
    companyId: string,
    transactionId: string,
  ): Promise<FiscalBoletaPrintPreview | null> {
    let emission = await this.emissionRepo.findOne({ where: { companyId, transactionId } });
    if (!emission) return null;
    if (emission.envioStatus === FiscalDteEmissionStatus.FAILED) {
      emission =
        (await this.reconcileFailedIfSiiAccepted(companyId, emission)) ?? emission;
    }
    if (
      (emission.envioStatus !== FiscalDteEmissionStatus.SENT &&
        emission.envioStatus !== FiscalDteEmissionStatus.EPR) ||
      !emission.tedXml
    ) {
      return null;
    }
    const result = await this.resultFromExisting(companyId, emission);
    return result.printPreview ?? null;
  }

  private async reconcileFailedIfSiiAccepted(
    companyId: string,
    emission: FiscalDteEmission,
  ): Promise<FiscalDteEmission | null> {
    if (emission.envioStatus !== FiscalDteEmissionStatus.FAILED) return null;
    const msg = emission.errorDetail?.message;
    if (typeof msg !== 'string') return null;
    const jsonStart = msg.indexOf('{');
    if (jsonStart < 0) return null;
    const payload = msg.slice(jsonStart);
    const trackId = extractTrackIdFromEnvioResponse(payload);
    if (!trackId) return null;
    const estado = extractEstadoFromEnvioStatusResponse(payload);
    if (estado === 'EPR') {
      emission.envioStatus = FiscalDteEmissionStatus.EPR;
    } else if (estado === 'REC') {
      emission.envioStatus = FiscalDteEmissionStatus.SENT;
    } else {
      return null;
    }
    emission.trackId = trackId;
    emission.errorDetail = null;
    const saved = await this.emissionRepo.save(emission);
    await this.transactionRepo.update(
      { id: emission.transactionId, companyId },
      {
        documentType: 'BOLETA',
        documentFolio: String(emission.folio),
      },
    );
    this.logger.log(
      `Emisión fiscal reconciliada venta ${emission.transactionId} folio ${emission.folio} track ${trackId}`,
    );
    return saved;
  }

  private async resultFromExisting(
    companyId: string,
    emission: FiscalDteEmission,
  ): Promise<FiscalEmissionResult> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const transaction = await this.transactionRepo.findOne({
      where: { id: emission.transactionId },
    });
    const lines = await this.lineRepo.find({ where: { transactionId: emission.transactionId } });
    if (!company || !transaction || !lines.length || !emission.tedXml) {
      return {
        status: isSuccessfulEnvioStatus(emission.envioStatus) ? 'SENT' : 'FAILED',
        folio: emission.folio,
        trackId: emission.trackId,
        error:
          emission.errorDetail && typeof emission.errorDetail.message === 'string'
            ? emission.errorDetail.message
            : undefined,
      };
    }
    let person: Person | null = null;
    if (transaction.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: transaction.customerId },
        relations: ['person'],
      });
      person = customer?.person ?? null;
    }
    const doc = mapTransactionToSaleBoleta(lines, person);
    const printPreview = buildSaleBoletaPrintPreview({
      company,
      doc,
      folio: emission.folio,
      issuedAt: emission.issuedAt,
      tedXml: emission.tedXml,
      transactionDocumentNumber: transaction.documentNumber,
    });
    return {
      status: isSuccessfulEnvioStatus(emission.envioStatus) ? 'SENT' : 'FAILED',
      folio: emission.folio,
      trackId: emission.trackId,
      error:
        emission.errorDetail && typeof emission.errorDetail.message === 'string'
          ? emission.errorDetail.message
          : undefined,
      printPreview,
    };
  }

  private async peekPosFolio(
    pointOfSaleId: string,
  ): Promise<{ folio: number; cafId: string; allocationId: string } | null> {
    const allocation = await this.posFolioAllocation.getActiveAllocation(pointOfSaleId, 39);
    if (!allocation || allocation.nextFolio > allocation.rangeTo) {
      return null;
    }
    return {
      folio: allocation.nextFolio,
      cafId: allocation.cafId,
      allocationId: allocation.id,
    };
  }

  private buildAndSignSaleBoleta(
    emisor: ReturnType<typeof emisorFromCompany>,
    saleDoc: ReturnType<typeof mapTransactionToSaleBoleta>,
    folio: number,
    cafXml: string,
    issuedAt: string,
    material: ReturnType<SiiBoletaAuthService['loadPfx']>,
    rutEnvia: string,
  ): { tedXml: string; signedDte: string; signedEnvio: string } {
    const built = buildSaleDteBoletaXml(emisor, saleDoc, folio, {
      cafXml,
      issuedAt,
    });
    const signedDte = this.auth.signDteBoleta(
      withIso8859Declaration(built.dteXml),
      `F${folio}T39`,
      material,
    );
    const signedEnvio = buildSignedEnvioBoleta(
      this.auth,
      emisor,
      [signedDte],
      rutEnvia,
      material,
    );
    const validation = this.schemaValidator.validateEnvioBoletaXml(signedEnvio);
    if (!validation.valid) {
      throw new Error(
        `XML no cumple schema SII: ${(validation.errors[0] ?? 'error desconocido').slice(0, 300)}`,
      );
    }
    return { tedXml: built.tedXml, signedDte, signedEnvio };
  }

  private async saveFailedEmission(params: {
    companyId: string;
    transactionId: string;
    folio: number;
    receptor: { rut: string; name: string };
    issuedAt: string;
    error: string;
  }): Promise<void> {
    await this.emissionRepo.save(
      this.emissionRepo.create({
        companyId: params.companyId,
        transactionId: params.transactionId,
        dteType: 39,
        folio: params.folio,
        environment: SiiEnvironment.PRODUCTION,
        receptorRut: params.receptor.rut,
        receptorName: params.receptor.name,
        envioStatus: FiscalDteEmissionStatus.FAILED,
        errorDetail: { message: params.error },
        issuedAt: params.issuedAt,
      }),
    );
  }

  private async loadCafXmlById(cafId: string): Promise<string> {
    const caf = await this.cafRepo.findOne({ where: { id: cafId } });
    if (!caf) throw new BadRequestException('CAF no encontrado');
    return this.crypto.decrypt(caf.encryptedCafXml, caf.cafIv).toString('utf8');
  }

  private resolveRutEnvia(
    material: ReturnType<SiiBoletaAuthService['loadPfx']>,
    emisorRut: string,
  ): string {
    const signerRut = this.auth.getSignerRut(material);
    if (!signerRut) {
      throw new BadRequestException(
        'No se pudo leer el RUT del firmante desde el certificado digital',
      );
    }
    return signerRut;
  }

  private async loadPfxMaterial(companyId: string) {
    const cert = await this.certRepo.findOne({
      where: { companyId },
      order: { uploadedAt: 'DESC' },
    });
    if (!cert) throw new BadRequestException('Certificado no cargado');
    const pfx = this.crypto.decrypt(cert.encryptedPfx, cert.pfxIv);
    const pass = this.crypto.decrypt(cert.encryptedPassword, cert.passwordIv).toString('utf8');
    return this.auth.loadPfx(pfx, pass);
  }

  private async obtainToken(
    env: SiiEnvironment,
    material: ReturnType<SiiBoletaAuthService['loadPfx']>,
  ) {
    const semillaXml = await this.sii.getSemilla(env);
    const seed = this.auth.parseSeed(semillaXml);
    const signed = this.auth.buildSignedGetTokenXml(seed, material);
    return this.sii.postToken(env, signed);
  }
}
