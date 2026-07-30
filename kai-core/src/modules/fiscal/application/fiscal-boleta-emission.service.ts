import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AppConfigService } from '../../../config/config.service';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import type { VariantTaxCategory } from '@modules/product-variants/domain/variant-tax-category';
import { FiscalProfile } from '../domain/fiscal-profile.entity';
import { FiscalCertificate } from '../domain/fiscal-certificate.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import {
  FiscalDteEmissionStatus,
  SiiEnvironment,
} from '../domain/fiscal.enums';
import { emisorFromCompany } from '../domain/fiscal-emisor-from-company';
import { buildVariantTaxCategoryMap } from '../domain/resolve-line-boleta-exempt';
import { mapTransactionToSaleBoleta } from '../domain/map-transaction-to-sale-boleta';
import {
  filterDteTransactionLines,
  type VariantRequiresDteMap,
} from '../domain/filter-dte-transaction-lines';
import {
  buildDbRequiresDteMap,
  parsePosLineRequiresDteSnapshot,
  resolveEffectiveLineRequiresDteMap,
} from '../domain/resolve-effective-line-requires-dte';
import { validateOfflineTedAgainstSaleContext } from '../domain/validate-offline-ted-sale-context';
import {
  allocateOrderDiscountForTransactionLines,
  applyOrderDiscountToSaleBoletaDocument,
  resolveTransactionOrderDiscount,
} from '../domain/allocate-mixed-sale-order-discount';
import { buildSaleBoletaPrintPreview } from '../domain/build-sale-boleta-print-preview';
import { FiscalCryptoService } from '../infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from '../infrastructure/sii-boleta-auth.service';
import { SiiBoletaRestClient } from '../infrastructure/sii-boleta-rest.client';
import { buildSaleDteBoletaXml } from '../infrastructure/boleta-envio.builder';
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
  computeSubmitBackoffMs,
  hasPrintableBoleta,
} from './fiscal-emission-status.util';
import { FISCAL_EMISSION_PENDING_EVENT } from './fiscal-emission.events';
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

export type FiscalEmissionStatusSnapshot = {
  emissionId: string;
  envioStatus: FiscalDteEmissionStatus;
  folio: number;
  trackId: string | null;
  errorMessage: string | null;
  canReprint: boolean;
  siiPending: boolean;
};

type SaleEmissionContext = {
  company: Company;
  transaction: Transaction;
  lines: TransactionLine[];
  dteLines: TransactionLine[];
  saleDoc: ReturnType<typeof mapTransactionToSaleBoleta> | null;
  issuedAt: string;
  emisor: ReturnType<typeof emisorFromCompany>;
  material: ReturnType<SiiBoletaAuthService['loadPfx']>;
  rutEnvia: string;
};

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
    private readonly appConfig: AppConfigService,
    private readonly crypto: FiscalCryptoService,
    private readonly auth: SiiBoletaAuthService,
    private readonly sii: SiiBoletaRestClient,
    private readonly schemaValidator: FiscalXmlSchemaValidator,
    private readonly posFolioAllocation: PosFolioAllocationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Fase rápida (async Fase B): reserva folio, firma DTE/TED, persiste PENDING y devuelve preview.
   * No llama al SII en el request path.
   */
  async prepareFromSale(
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
      return this.handleExistingEmissionForPrepare(companyId, existing);
    }

    let ctx: SaleEmissionContext;
    try {
      ctx = await this.loadSaleEmissionContext(companyId, transactionId);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const message = e instanceof Error ? e.message : 'Error al preparar emisión';
      return { status: 'FAILED', error: message };
    }

    if (ctx.transaction.transactionType !== TransactionType.SALE) {
      return { status: 'SKIPPED' };
    }
    if (!ctx.dteLines.length || !ctx.saleDoc) {
      return { status: 'SKIPPED', skippedReason: 'NO_DTE_LINES' };
    }
    const saleDoc = ctx.saleDoc;

    let emission: FiscalDteEmission;
    try {
      emission = await this.dataSource.transaction(async (manager) => {
        const reserved = await this.posFolioAllocation.reserveFolioInManager(
          manager,
          pointOfSaleId,
          39,
        );
        const cafXml = await this.loadCafXmlById(reserved.cafId);
        const built = this.buildAndSignSaleBoleta(
          ctx.emisor,
          saleDoc,
          reserved.folio,
          cafXml,
          ctx.issuedAt,
          ctx.material,
          ctx.rutEnvia,
        );
        const encrypted = this.encryptSignedEnvio(built.signedEnvio);
        const row = manager.getRepository(FiscalDteEmission).create({
          companyId,
          transactionId,
          pointOfSaleId,
          cafId: reserved.cafId,
          allocationId: reserved.allocationId,
          dteType: 39,
          folio: reserved.folio,
          environment: SiiEnvironment.PRODUCTION,
          receptorRut: saleDoc.receptor.rut,
          receptorName: saleDoc.receptor.name,
          envioStatus: FiscalDteEmissionStatus.PENDING,
          tedXml: built.tedXml,
          encryptedSignedEnvio: encrypted.encrypted,
          signedEnvioIv: encrypted.iv,
          submitAttempts: 0,
          pollAttempts: 0,
          issuedAt: ctx.issuedAt,
        });
        const saved = await manager.getRepository(FiscalDteEmission).save(row);
        await manager.getRepository(Transaction).update(transactionId, {
          documentType: 'BOLETA',
          documentFolio: String(reserved.folio),
        });
        return saved;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al reservar folio o firmar DTE';
      if (message.includes('folios') || message.includes('Folio')) {
        return { status: 'FAILED', error: 'No hay folios disponibles' };
      }
      return { status: 'FAILED', error: message };
    }

    this.eventEmitter.emit(FISCAL_EMISSION_PENDING_EVENT, { emissionId: emission.id });

    const printPreview = buildSaleBoletaPrintPreview({
      company: ctx.company,
      doc: saleDoc,
      folio: emission.folio,
      issuedAt: ctx.issuedAt,
      tedXml: emission.tedXml!,
      transactionDocumentNumber: ctx.transaction.documentNumber,
    });

    return {
      status: 'PENDING',
      emissionId: emission.id,
      folio: emission.folio,
      printPreview,
      siiPending: true,
    };
  }

  /**
   * Adopta emisión offline ya timbrada en cliente: reconcilia folio POS,
   * firma envío con PFX y persiste PENDING para el worker SII.
   */
  async adoptOfflineEmission(
    companyId: string,
    transactionId: string,
    pointOfSaleId: string,
    fiscal: {
      folio: number;
      allocationId: string;
      cafId: string;
      tedXml: string;
      issuedAt: string;
    },
  ): Promise<FiscalEmissionResult> {
    const profile = await this.profileRepo.findOne({ where: { companyId } });
    if (!profile?.productionEnabled) {
      return { status: 'SKIPPED' };
    }

    const existing = await this.emissionRepo.findOne({ where: { transactionId } });
    if (existing) {
      return this.handleExistingEmissionForPrepare(companyId, existing);
    }

    const ctx = await this.loadSaleEmissionContext(companyId, transactionId);
    if (ctx.transaction.transactionType !== TransactionType.SALE) {
      return { status: 'SKIPPED' };
    }
    if (!ctx.dteLines.length || !ctx.saleDoc) {
      return { status: 'SKIPPED', skippedReason: 'NO_DTE_LINES' };
    }
    const saleDoc = ctx.saleDoc;

    const tedMismatch = validateOfflineTedAgainstSaleContext(
      fiscal.tedXml,
      saleDoc,
    );
    if (tedMismatch) {
      return { status: 'FAILED', error: tedMismatch };
    }

    const tedMatch = fiscal.tedXml.match(/<TSTED>([^<]+)<\/TSTED>/i);
    const tmstFirma = tedMatch?.[1]?.trim() || fiscal.issuedAt;

    let emission: FiscalDteEmission;
    try {
      emission = await this.dataSource.transaction(async (manager) => {
        await this.posFolioAllocation.reconcileOfflineFolioInManager(
          manager,
          fiscal.allocationId,
          fiscal.cafId,
          fiscal.folio,
        );

        const built = buildSaleDteBoletaXml(
          ctx.emisor,
          saleDoc,
          fiscal.folio,
          {
            issuedAt: fiscal.issuedAt,
            tedXml: fiscal.tedXml,
            tmstFirma,
          },
        );
        const signedDte = this.auth.signDteBoleta(
          withIso8859Declaration(built.dteXml),
          `F${fiscal.folio}T39`,
          ctx.material,
        );
        const signedEnvio = buildSignedEnvioBoleta(
          this.auth,
          ctx.emisor,
          [signedDte],
          ctx.rutEnvia,
          ctx.material,
        );
        const validation = this.schemaValidator.validateEnvioBoletaXml(signedEnvio);
        if (!validation.valid) {
          throw new Error(
            `XML no cumple schema SII: ${(validation.errors[0] ?? 'error desconocido').slice(0, 300)}`,
          );
        }

        const encrypted = this.encryptSignedEnvio(signedEnvio);
        const row = manager.getRepository(FiscalDteEmission).create({
          companyId,
          transactionId,
          pointOfSaleId,
          cafId: fiscal.cafId,
          allocationId: fiscal.allocationId,
          dteType: 39,
          folio: fiscal.folio,
          environment: SiiEnvironment.PRODUCTION,
          receptorRut: saleDoc.receptor.rut,
          receptorName: saleDoc.receptor.name,
          envioStatus: FiscalDteEmissionStatus.PENDING,
          tedXml: fiscal.tedXml,
          encryptedSignedEnvio: encrypted.encrypted,
          signedEnvioIv: encrypted.iv,
          submitAttempts: 0,
          pollAttempts: 0,
          issuedAt: fiscal.issuedAt,
        });
        const saved = await manager.getRepository(FiscalDteEmission).save(row);
        await manager.getRepository(Transaction).update(transactionId, {
          documentType: 'BOLETA',
          documentFolio: String(fiscal.folio),
        });
        return saved;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al adoptar emisión offline';
      if (message.includes('rango') || message.includes('Folio')) {
        return { status: 'FAILED', error: message };
      }
      return { status: 'FAILED', error: message };
    }

    this.eventEmitter.emit(FISCAL_EMISSION_PENDING_EVENT, { emissionId: emission.id });

    const printPreview = buildSaleBoletaPrintPreview({
      company: ctx.company,
      doc: saleDoc,
      folio: emission.folio,
      issuedAt: fiscal.issuedAt,
      tedXml: emission.tedXml!,
      transactionDocumentNumber: ctx.transaction.documentNumber,
    });

    return {
      status: 'PENDING',
      emissionId: emission.id,
      folio: emission.folio,
      printPreview,
      siiPending: true,
    };
  }

  /** Envía al SII una emisión PENDING/FAILED o hace poll de una SENT. */
  async submitPendingToSii(emissionId: string): Promise<void> {
    const emission = await this.tryClaimEmission(emissionId);
    if (!emission) {
      return;
    }

    const cfg = this.appConfig.fiscalEmission;
    try {
      if (
        emission.trackId?.trim() &&
        (emission.envioStatus === FiscalDteEmissionStatus.SENT ||
          emission.envioStatus === FiscalDteEmissionStatus.SENDING)
      ) {
        await this.pollEmissionSiiStatus(emission);
        return;
      }

      const signedEnvio = this.decryptSignedEnvio(
        emission.encryptedSignedEnvio!,
        emission.signedEnvioIv!,
      );
      const company = await this.companyRepo.findOne({ where: { id: emission.companyId } });
      if (!company) {
        throw new NotFoundException('Empresa no encontrada');
      }
      const emisor = emisorFromCompany(company);
      const material = await this.loadPfxMaterial(emission.companyId);
      const rutEnvia = this.resolveRutEnvia(material, emisor.rut);
      const token = await this.obtainToken(emission.environment, material);
      const result = await validateAndPostEnvioBoleta(this.schemaValidator, this.sii, {
        environment: emission.environment,
        token,
        signedXml: signedEnvio,
        companyRut: emisor.rut,
        rutEnvia,
      });

      emission.trackId = result.trackId;
      emission.submittedAt = new Date();
      emission.envioStatus = FiscalDteEmissionStatus.SENT;
      emission.errorDetail = null;
      emission.processingClaimedAt = null;
      await this.emissionRepo.save(emission);

      await this.pollEmissionSiiStatus(emission, token, emisor.rut, result.retryAfter);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      emission.submitAttempts = (emission.submitAttempts ?? 0) + 1;
      emission.envioStatus = FiscalDteEmissionStatus.FAILED;
      emission.errorDetail = { message };
      emission.processingClaimedAt = null;

      if (emission.submitAttempts >= cfg.maxSubmitAttempts) {
        this.logger.error(
          `Emisión ${emissionId} agotó reintentos SII (${emission.submitAttempts}): ${message}`,
        );
      } else {
        const backoff = computeSubmitBackoffMs(
          emission.submitAttempts,
          cfg.submitBackoffBaseMs,
        );
        emission.nextRetryAt = new Date(Date.now() + backoff);
        this.logger.warn(
          `Envío SII falló emisión ${emissionId} intento ${emission.submitAttempts}, retry en ${backoff}ms: ${message}`,
        );
      }
      await this.emissionRepo.save(emission);
    }
  }

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
      } else if (hasPrintableBoleta(existing)) {
        return this.resultFromExisting(companyId, existing);
      }
    }

    const ctx = await this.loadSaleEmissionContext(companyId, transactionId);
    if (ctx.transaction.transactionType !== TransactionType.SALE) {
      return { status: 'SKIPPED' };
    }
    if (!ctx.dteLines.length || !ctx.saleDoc) {
      return { status: 'SKIPPED', skippedReason: 'NO_DTE_LINES' };
    }
    const saleDoc = ctx.saleDoc;

    const peeked = await this.peekPosFolio(pointOfSaleId);
    if (!peeked) {
      return { status: 'FAILED', error: 'No hay folios disponibles' };
    }

    const cafXml = await this.loadCafXmlById(peeked.cafId);
    let folio = peeked.folio;
    let tedXml: string;
    let signedEnvio: string;
    try {
      const built = this.buildAndSignSaleBoleta(
        ctx.emisor,
        saleDoc,
        folio,
        cafXml,
        ctx.issuedAt,
        ctx.material,
        ctx.rutEnvia,
      );
      tedXml = built.tedXml;
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
          ctx.emisor,
          saleDoc,
          folio,
          reservedCafXml,
          ctx.issuedAt,
          ctx.material,
          ctx.rutEnvia,
        );
        tedXml = rebuilt.tedXml;
        signedEnvio = rebuilt.signedEnvio;
      }

      const token = await this.obtainToken(SiiEnvironment.PRODUCTION, ctx.material);
      const result = await validateAndPostEnvioBoleta(this.schemaValidator, this.sii, {
        environment: SiiEnvironment.PRODUCTION,
        token,
        signedXml: signedEnvio,
        companyRut: ctx.emisor.rut,
        rutEnvia: ctx.rutEnvia,
      });
      trackId = result.trackId;
      try {
        const polled = await pollEnvioStatus(
          () =>
            this.sii.getEnvioStatus(SiiEnvironment.PRODUCTION, token, ctx.emisor.rut, trackId!),
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

    const encrypted = signedEnvio ? this.encryptSignedEnvio(signedEnvio) : null;
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
        encryptedSignedEnvio: encrypted?.encrypted ?? null,
        signedEnvioIv: encrypted?.iv ?? null,
        errorDetail:
          errorMessage != null
            ? { message: errorMessage, siiStatusRaw: siiStatusRaw ?? null }
            : siiStatusRaw
              ? { siiStatusRaw }
              : null,
        issuedAt: ctx.issuedAt,
      }),
    );

    if (isSuccessfulEnvioStatus(envioStatus)) {
      await this.transactionRepo.update(transactionId, {
        documentType: 'BOLETA',
        documentFolio: String(folio),
      });
    }

    const printPreview = buildSaleBoletaPrintPreview({
      company: ctx.company,
      doc: saleDoc,
      folio,
      issuedAt: ctx.issuedAt,
      tedXml,
      transactionDocumentNumber: ctx.transaction.documentNumber,
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

    const resultStatus =
      envioStatus === FiscalDteEmissionStatus.EPR ? 'EPR' : 'SENT';

    return {
      status: resultStatus,
      emissionId: emission.id,
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

    await this.pollEmissionSiiStatus(emission);
    const saved = await this.emissionRepo.findOne({ where: { id: emissionId } });
    return this.mapEmissionToListItem(saved!);
  }

  async getEmissionStatusForTransaction(
    companyId: string,
    transactionId: string,
  ): Promise<FiscalEmissionStatusSnapshot | null> {
    const emission = await this.emissionRepo.findOne({ where: { companyId, transactionId } });
    if (!emission) return null;
    const err =
      emission.errorDetail && typeof emission.errorDetail.message === 'string'
        ? emission.errorDetail.message
        : null;
    return {
      emissionId: emission.id,
      envioStatus: emission.envioStatus,
      folio: emission.folio,
      trackId: emission.trackId ?? null,
      errorMessage: err,
      canReprint: hasPrintableBoleta(emission),
      siiPending:
        emission.envioStatus === FiscalDteEmissionStatus.PENDING ||
        emission.envioStatus === FiscalDteEmissionStatus.SENDING ||
        emission.envioStatus === FiscalDteEmissionStatus.SENT,
    };
  }

  async retryFromSale(
    companyId: string,
    transactionId: string,
    pointOfSaleId?: string,
  ): Promise<FiscalEmissionResult> {
    const existing = await this.emissionRepo.findOne({ where: { transactionId, companyId } });
    if (!existing) {
      let resolvedPosId = pointOfSaleId?.trim() || '';
      if (!resolvedPosId) {
        const tx = await this.transactionRepo.findOne({ where: { id: transactionId, companyId } });
        resolvedPosId = tx?.pointOfSaleId?.trim() ?? '';
      }
      if (!resolvedPosId) {
        throw new BadRequestException('pointOfSaleId es requerido para reintentar emisión');
      }
      if (this.appConfig.fiscalEmission.boletaAsyncEmit) {
        return this.prepareFromSale(companyId, transactionId, resolvedPosId);
      }
      return this.emitFromSale(companyId, transactionId, resolvedPosId);
    }

    if (isSuccessfulEnvioStatus(existing.envioStatus) || existing.envioStatus === FiscalDteEmissionStatus.EPR) {
      return this.resultFromExisting(companyId, existing);
    }

    if (existing.envioStatus === FiscalDteEmissionStatus.FAILED) {
      const reconciled = await this.reconcileFailedIfSiiAccepted(companyId, existing);
      if (reconciled) {
        return this.resultFromExisting(companyId, reconciled);
      }
    }

    if (!existing.encryptedSignedEnvio || !existing.signedEnvioIv) {
      throw new BadRequestException(
        'La emisión no tiene XML firmado almacenado; no se puede reenviar el mismo folio',
      );
    }

    existing.envioStatus = FiscalDteEmissionStatus.PENDING;
    existing.nextRetryAt = null;
    existing.processingClaimedAt = null;
    await this.emissionRepo.save(existing);
    this.eventEmitter.emit(FISCAL_EMISSION_PENDING_EVENT, { emissionId: existing.id });
    await this.submitPendingToSii(existing.id);

    const refreshed = await this.emissionRepo.findOne({ where: { id: existing.id } });
    return this.resultFromExisting(companyId, refreshed!);
  }

  async listPendingEmissionIdsForWorker(limit: number): Promise<string[]> {
    const cfg = this.appConfig.fiscalEmission;
    const staleMs = cfg.staleSendingMs;
    const rows = (await this.dataSource.query(
      `
      SELECT e.id
      FROM fiscal_dte_emissions e
      WHERE (
        (
          e.envio_status IN ('PENDING', 'FAILED')
          AND (e.next_retry_at IS NULL OR e.next_retry_at <= NOW())
          AND e.submit_attempts < $1
          AND e.encrypted_signed_envio IS NOT NULL
        )
        OR (
          e.envio_status = 'SENT'
          AND e.track_id IS NOT NULL
          AND e.envio_status NOT IN ('EPR', 'RCH')
          AND (e.sii_poll_after IS NULL OR e.sii_poll_after <= NOW())
        )
        OR (
          e.envio_status = 'SENDING'
          AND e.processing_claimed_at IS NOT NULL
          AND e.processing_claimed_at < NOW() - ($2::int * INTERVAL '1 millisecond')
        )
      )
      ORDER BY e.created_at ASC
      LIMIT $3
      FOR UPDATE OF e SKIP LOCKED
      `,
      [cfg.maxSubmitAttempts, staleMs, limit],
    )) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  async recoverStaleSendingEmissions(): Promise<number> {
    const cfg = this.appConfig.fiscalEmission;
    const result = await this.dataSource.query(
      `
      UPDATE fiscal_dte_emissions
      SET envio_status = 'PENDING', processing_claimed_at = NULL
      WHERE envio_status = 'SENDING'
        AND processing_claimed_at IS NOT NULL
        AND processing_claimed_at < NOW() - ($1::int * INTERVAL '1 millisecond')
      `,
      [cfg.staleSendingMs],
    );
    return typeof result?.[1] === 'number' ? result[1] : 0;
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
    if (!hasPrintableBoleta(emission)) {
      return null;
    }
    const result = await this.resultFromExisting(companyId, emission);
    return result.printPreview ?? null;
  }

  private async handleExistingEmissionForPrepare(
    companyId: string,
    existing: FiscalDteEmission,
  ): Promise<FiscalEmissionResult> {
    if (existing.envioStatus === FiscalDteEmissionStatus.FAILED) {
      const reconciled = await this.reconcileFailedIfSiiAccepted(companyId, existing);
      if (reconciled) {
        return this.resultFromExisting(companyId, reconciled);
      }
    }
    if (hasPrintableBoleta(existing)) {
      return this.resultFromExisting(companyId, existing);
    }
    if (isSuccessfulEnvioStatus(existing.envioStatus)) {
      return this.resultFromExisting(companyId, existing);
    }
    return { status: 'FAILED', folio: existing.folio, error: 'Emisión existente sin TED' };
  }

  private async tryClaimEmission(emissionId: string): Promise<FiscalDteEmission | null> {
    const cfg = this.appConfig.fiscalEmission;
    const rows = (await this.dataSource.query(
      `
      UPDATE fiscal_dte_emissions
      SET envio_status = 'SENDING', processing_claimed_at = NOW()
      WHERE id = $1
        AND (
          (
            envio_status IN ('PENDING', 'FAILED')
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
            AND submit_attempts < $2
            AND encrypted_signed_envio IS NOT NULL
          )
          OR (
            envio_status = 'SENT'
            AND track_id IS NOT NULL
          )
          OR (
            envio_status = 'SENDING'
            AND processing_claimed_at IS NOT NULL
            AND processing_claimed_at < NOW() - ($3::int * INTERVAL '1 millisecond')
          )
        )
      RETURNING id
      `,
      [emissionId, cfg.maxSubmitAttempts, cfg.staleSendingMs],
    )) as Array<{ id: string }>;
    if (!rows.length) {
      return null;
    }
    return this.emissionRepo.findOne({ where: { id: emissionId } });
  }

  private async pollEmissionSiiStatus(
    emission: FiscalDteEmission,
    tokenOverride?: string,
    emisorRutOverride?: string,
    retryAfter?: string,
  ): Promise<void> {
    if (!emission.trackId?.trim()) {
      return;
    }
    const company = await this.companyRepo.findOne({ where: { id: emission.companyId } });
    if (!company) return;
    const emisor = emisorFromCompany(company);
    const material = await this.loadPfxMaterial(emission.companyId);
    const token = tokenOverride ?? (await this.obtainToken(emission.environment, material));
    const rut = emisorRutOverride ?? emisor.rut;

    try {
      const polled = await pollEnvioStatus(
        async () => {
          const { raw } = await this.sii.getEnvioStatus(
            emission.environment,
            token,
            rut,
            emission.trackId!,
          );
          return { estado: extractEstadoFromEnvioStatusResponse(raw), raw };
        },
        { initialDelayMs: resolveInitialPollDelayMs(retryAfter) },
      );
      emission.envioStatus = polled.envioStatus;
      emission.pollAttempts = (emission.pollAttempts ?? 0) + 1;
      emission.processingClaimedAt = null;
      if (polled.rejectionMessage) {
        emission.errorDetail = {
          message: polled.rejectionMessage,
          siiStatusRaw: polled.raw,
        };
      } else {
        emission.errorDetail = { siiStatusRaw: polled.raw };
      }
      await this.emissionRepo.save(emission);
    } catch (pollErr) {
      emission.processingClaimedAt = null;
      emission.siiPollAfter = new Date(Date.now() + 60_000);
      await this.emissionRepo.save(emission);
      this.logger.warn(
        `Poll SII falló emisión ${emission.id}: ${
          pollErr instanceof Error ? pollErr.message : String(pollErr)
        }`,
      );
    }
  }

  private async loadSaleEmissionContext(
    companyId: string,
    transactionId: string,
  ): Promise<SaleEmissionContext> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }
    const lines = await this.lineRepo.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
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
    const variantTaxCategoryByVariantId = await this.loadVariantTaxCategoryMap(lines);
    const requiresDteByVariantId = await this.resolveRequiresDteMapForTransaction(
      transaction,
      lines,
    );
    const dteLines = filterDteTransactionLines(lines, requiresDteByVariantId);
    let saleDoc =
      dteLines.length > 0
        ? mapTransactionToSaleBoleta(dteLines, person, variantTaxCategoryByVariantId)
        : null;
    if (saleDoc) {
      const orderDiscount = resolveTransactionOrderDiscount(
        Number(transaction.discountAmount) || 0,
        lines,
      );
      if (orderDiscount > 0) {
        const { dteOrderDiscount } = allocateOrderDiscountForTransactionLines(
          lines,
          requiresDteByVariantId,
          orderDiscount,
        );
        if (dteOrderDiscount > 0) {
          saleDoc = applyOrderDiscountToSaleBoletaDocument(
            saleDoc,
            dteLines,
            dteOrderDiscount,
          );
        }
      }
    }
    const issuedAt = (transaction.createdAt ?? new Date()).toISOString().slice(0, 10);
    const material = await this.loadPfxMaterial(companyId);
    const rutEnvia = this.resolveRutEnvia(material, emisor.rut);
    return {
      company,
      transaction,
      lines,
      dteLines,
      saleDoc,
      issuedAt,
      emisor,
      material,
      rutEnvia,
    };
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

  private mapDbStatusToResultStatus(
    status: FiscalDteEmissionStatus,
  ): FiscalEmissionResult['status'] {
    if (
      status === FiscalDteEmissionStatus.PENDING ||
      status === FiscalDteEmissionStatus.SENDING
    ) {
      return 'PENDING';
    }
    if (status === FiscalDteEmissionStatus.EPR) return 'EPR';
    if (status === FiscalDteEmissionStatus.SENT) return 'SENT';
    return 'FAILED';
  }

  private async resultFromExisting(
    companyId: string,
    emission: FiscalDteEmission,
  ): Promise<FiscalEmissionResult> {
    const status = this.mapDbStatusToResultStatus(emission.envioStatus);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const transaction = await this.transactionRepo.findOne({
      where: { id: emission.transactionId },
    });
    const lines = await this.lineRepo.find({ where: { transactionId: emission.transactionId } });
    if (!company || !transaction || !lines.length || !emission.tedXml) {
      return {
        status,
        emissionId: emission.id,
        folio: emission.folio,
        trackId: emission.trackId,
        siiPending: status === 'PENDING',
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
    const doc = mapTransactionToSaleBoleta(
      lines,
      person,
      await this.loadVariantTaxCategoryMap(lines),
    );
    const printPreview = buildSaleBoletaPrintPreview({
      company,
      doc,
      folio: emission.folio,
      issuedAt: emission.issuedAt,
      tedXml: emission.tedXml,
      transactionDocumentNumber: transaction.documentNumber,
    });
    return {
      status,
      emissionId: emission.id,
      folio: emission.folio,
      trackId: emission.trackId,
      siiPending: status === 'PENDING' || status === 'SENT',
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

  private async resolveRequiresDteMapForTransaction(
    transaction: Transaction,
    lines: TransactionLine[],
  ): Promise<VariantRequiresDteMap> {
    const meta =
      transaction.metadata && typeof transaction.metadata === 'object'
        ? (transaction.metadata as Record<string, unknown>)
        : {};

    const variantIds = [
      ...new Set(
        lines
          .map((line) => line.productVariantId?.trim() ?? '')
          .filter(Boolean),
      ),
    ];
    if (variantIds.length === 0) {
      return new Map();
    }
    const variants = await this.dataSource.getRepository(ProductVariant).find({
      where: { id: In(variantIds) },
      select: ['id', 'requiresDte', 'taxCategory', 'taxIds'],
    });
    const dbMap = buildDbRequiresDteMap(variants);
    const posSnapshot = parsePosLineRequiresDteSnapshot(meta);
    return resolveEffectiveLineRequiresDteMap(variantIds, dbMap, posSnapshot);
  }

  private async loadVariantRequiresDteMap(
    lines: TransactionLine[],
  ): Promise<VariantRequiresDteMap> {
    const variantIds = [
      ...new Set(
        lines
          .map((line) => line.productVariantId?.trim() ?? '')
          .filter((id) => id.length > 0),
      ),
    ];
    if (variantIds.length === 0) {
      return new Map();
    }
    const variants = await this.dataSource.getRepository(ProductVariant).find({
      where: { id: In(variantIds) },
      select: ['id', 'requiresDte'],
    });
    return new Map(
      variants.map((variant) => [variant.id, variant.requiresDte !== false] as const),
    );
  }

  private async loadVariantTaxCategoryMap(
    lines: TransactionLine[],
  ): Promise<Map<string, VariantTaxCategory>> {
    const variantIds = [
      ...new Set(
        lines
          .map((line) => line.productVariantId?.trim() ?? '')
          .filter((id) => id.length > 0),
      ),
    ];
    if (variantIds.length === 0) {
      return new Map();
    }
    const variants = await this.dataSource.getRepository(ProductVariant).find({
      where: { id: In(variantIds) },
      select: ['id', 'taxCategory'],
    });
    return buildVariantTaxCategoryMap(
      variants.map((variant) => ({
        variantId: variant.id,
        taxCategory: variant.taxCategory,
      })),
    );
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

  private encryptSignedEnvio(signedXml: string): { encrypted: string; iv: string } {
    const { data, iv } = this.crypto.encrypt(signedXml);
    return { encrypted: data.toString('base64'), iv };
  }

  private decryptSignedEnvio(encryptedB64: string, iv: string): string {
    return this.crypto.decrypt(Buffer.from(encryptedB64, 'base64'), iv).toString('utf8');
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
