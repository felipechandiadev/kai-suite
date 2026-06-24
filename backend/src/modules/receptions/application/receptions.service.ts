import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, Brackets } from 'typeorm';
import { Reception } from '../domain/reception.entity';
import { ReceptionLine } from '../domain/reception-line.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { User } from '@modules/users/domain/user.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { ParentPaymentAggregateService } from '@modules/transactions/application/services/parent-payment-aggregate.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { applyDteNumberToSupplierDocumentDto } from '@modules/transactions/presentation/helpers/supplier-dte-create.helper';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { CashSessionsService } from '@modules/cash-sessions/application/cash-sessions.service';

@Injectable()
export class ReceptionsService {
  private logger = new Logger(ReceptionsService.name);

  constructor(
    @InjectRepository(Reception)
    private readonly receptionRepo: Repository<Reception>,
    @InjectRepository(ReceptionLine)
    private readonly receptionLineRepo: Repository<ReceptionLine>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepo: Repository<CashSession>,
    private readonly transactionsService: TransactionsService,
    private readonly documentNumberService: DocumentNumberService,
    private readonly variantsService: ProductVariantsService,
    private readonly cashSessionsService: CashSessionsService,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
  ) {}

  private resolvePosCashSessionId(data: any): string | null {
    const id =
      typeof data?.cashSessionId === 'string' ? data.cashSessionId.trim() : '';
    return id || null;
  }

  private async assertPosCashSessionForReception(data: any): Promise<void> {
    const sessionId = this.resolvePosCashSessionId(data);
    if (!sessionId) {
      return;
    }
    const session = await this.cashSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new BadRequestException('Sesión de caja no encontrada.');
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException(
        `La sesión de caja está en estado ${session.status}; no se pueden registrar pagos en efectivo.`,
      );
    }
    const posId =
      typeof data?.pointOfSaleId === 'string' ? data.pointOfSaleId.trim() : '';
    if (
      posId &&
      session.pointOfSaleId &&
      session.pointOfSaleId !== posId
    ) {
      throw new BadRequestException(
        'La sesión de caja no pertenece al punto de venta indicado.',
      );
    }
  }

  private async resolveBranchIdForReception(reception: {
    branchId?: string | null;
    storageId?: string | null;
  }): Promise<string | null> {
    let branchId = reception.branchId ?? null;
    if (!branchId && reception.storageId) {
      const storage = await this.storageRepo.findOne({
        where: { id: reception.storageId },
      });
      if (storage?.branchId) {
        branchId = storage.branchId;
      }
    }
    if (branchId) {
      return branchId;
    }
    try {
      const branchWithCompany = await this.branchRepo.findOne({
        where: { companyId: Not(IsNull()) },
      });
      if (branchWithCompany?.id) {
        return branchWithCompany.id;
      }
      const anyBranch = await this.branchRepo.findOne({ where: {} });
      if (anyBranch?.id) {
        if (!anyBranch.companyId) {
          const lastCompany = await this.companyRepo.findOne({
            order: { createdAt: 'DESC' } as any,
          });
          if (lastCompany?.id) {
            await this.branchRepo.update(anyBranch.id, {
              companyId: lastCompany.id,
            } as any);
          }
        }
        return anyBranch.id;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Folio interno de recepción (CMP-YY-#####). Se asigna al guardar aunque falle el PURCHASE de stock.
   */
  private async ensureReceptionStockFolio(
    reception: Reception & { id: string },
  ): Promise<string | null> {
    const existing = this.resolveReceptionFolio(reception, null);
    if (existing) {
      return existing;
    }
    const branchId = await this.resolveBranchIdForReception(reception);
    if (!branchId) {
      this.logger.warn(
        `No se pudo determinar sucursal para folio de recepción ${reception.id}`,
      );
      return null;
    }
    try {
      const folio = await this.documentNumberService.allocateNext(
        branchId,
        TransactionType.PURCHASE,
        reception.companyId,
      );
      await this.receptionRepo.update({ id: reception.id }, { documentNumber: folio });
      reception.documentNumber = folio;
      return folio;
    } catch (err) {
      this.logger.error(
        `No se pudo asignar folio a recepción ${reception.id}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async enrichReceptionLines(reception: any) {
    if (!reception || !Array.isArray(reception.lines)) return;
    for (const l of reception.lines) {
      try {
        if (l.productVariantId) {
          const v = await this.variantsService.findOne(
            String(l.productVariantId),
          );
          if (v) {
            l.sku = l.sku || v.sku || l.sku;
            l.productName = l.productName || v.product?.name || l.productName;
            l.variantName = l.variantName || v.variantName || l.variantName;
            const stockUnit =
              (v as { stockBaseUnit?: { symbol?: string; name?: string } }).stockBaseUnit;
            l.stockUnitLabel =
              (typeof stockUnit?.symbol === 'string' && stockUnit.symbol.trim()) ||
              (typeof stockUnit?.name === 'string' && stockUnit.name.trim()) ||
              l.stockUnitLabel ||
              null;
          }
        }
      } catch (err) {
        // best-effort enrichment; ignore errors
      }
    }
  }

  private getSupplierDisplayName(reception: any): string | null {
    const supplier = reception?.supplier;
    if (!supplier) return null;
    const alias =
      typeof supplier.alias === 'string' ? supplier.alias.trim() : '';
    if (alias) return alias;
    const person = supplier.person;
    const businessName =
      typeof person?.businessName === 'string'
        ? person.businessName.trim()
        : '';
    if (businessName) return businessName;
    const firstName =
      typeof person?.firstName === 'string' ? person.firstName.trim() : '';
    const lastName =
      typeof person?.lastName === 'string' ? person.lastName.trim() : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || null;
  }

  private getStorageDisplayName(reception: any): string | null {
    const name =
      typeof reception?.storage?.name === 'string'
        ? reception.storage.name.trim()
        : '';
    return name || null;
  }

  /** DNI / RUN / RUT del proveedor (`person.documentNumber`). */
  private getSupplierDni(reception: any): string | null {
    const person = reception?.supplier?.person;
    const doc =
      typeof person?.documentNumber === 'string'
        ? person.documentNumber.trim()
        : '';
    return doc || null;
  }

  private async buildLineSnapshot(line: any) {
    const variantId =
      line?.productVariantId ||
      line?.variantId ||
      line?.productVariant?.id ||
      null;
    const baseName =
      typeof line?.productName === 'string' ? line.productName.trim() : '';
    let productName = baseName || '';
    let sku = typeof line?.sku === 'string' ? line.sku : undefined;
    let variantName =
      typeof line?.variantName === 'string' ? line.variantName : undefined;
    let productId = line?.productId || line?.product?.id || null;

    if (variantId && this.variantsService) {
      try {
        const v = await this.variantsService.findOne(String(variantId));
        if (v) {
          sku = sku || v.sku || sku;
          productName = productName || v.product?.name || productName;
          variantName = variantName || v.variantName || variantName;
          productId = productId || v.product?.id || productId;
        }
      } catch (err) {
        // ignore lookup errors
      }
    }

    return {
      productId: productId || undefined,
      productVariantId: variantId || undefined,
      productName: productName || 'Item',
      sku,
      variantName,
    };
  }

  private extractPurchaseOrderIdFromMetadata(
    metadata: unknown,
  ): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    const links = (metadata as { links?: unknown }).links;
    if (!links || typeof links !== 'object') {
      return null;
    }
    const id = (links as { purchaseOrderId?: unknown }).purchaseOrderId;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  }

  /** Folio de OC (`documentNumber`) por transacción de ingreso (PURCHASE) vinculada a la recepción. */
  private async loadPurchaseOrderFoliosByStockTransactionIds(
    stockTransactionIds: string[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        stockTransactionIds.filter((id) => typeof id === 'string' && id.trim()),
      ),
    ];
    const result = new Map<string, string>();
    if (ids.length === 0) {
      return result;
    }

    const stockTxs = await this.transactionRepo.find({
      where: { id: In(ids) },
      select: ['id', 'metadata'],
    });
    const poIds = new Set<string>();
    const stockToPo = new Map<string, string>();
    for (const tx of stockTxs) {
      const poId = this.extractPurchaseOrderIdFromMetadata(tx.metadata);
      if (poId) {
        poIds.add(poId);
        stockToPo.set(tx.id, poId);
      }
    }
    if (poIds.size === 0) {
      return result;
    }

    const poTxs = await this.transactionRepo.find({
      where: { id: In([...poIds]) },
      select: ['id', 'documentNumber'],
    });
    const folioByPoId = new Map<string, string>();
    for (const po of poTxs) {
      const folio =
        typeof po.documentNumber === 'string' ? po.documentNumber.trim() : '';
      if (folio) {
        folioByPoId.set(po.id, folio);
      }
    }
    for (const [stockId, poId] of stockToPo) {
      const folio = folioByPoId.get(poId);
      if (folio) {
        result.set(stockId, folio);
      }
    }
    return result;
  }

  private async loadStockFoliosByTransactionIds(
    transactionIds: string[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        transactionIds.filter((id) => typeof id === 'string' && id.trim()),
      ),
    ];
    const map = new Map<string, string>();
    if (ids.length === 0) {
      return map;
    }
    const txs = await this.transactionRepo.find({
      where: { id: In(ids) },
      select: ['id', 'documentNumber'],
    });
    for (const tx of txs) {
      const folio =
        typeof tx.documentNumber === 'string' ? tx.documentNumber.trim() : '';
      if (folio) {
        map.set(tx.id, folio);
      }
    }
    return map;
  }

  private resolveReceptionFolio(
    reception: any,
    stockFolio?: string | null,
  ): string | null {
    const fromTx =
      (typeof stockFolio === 'string' && stockFolio.trim()) ||
      (typeof reception?.transaction?.documentNumber === 'string' &&
        reception.transaction.documentNumber.trim()) ||
      null;
    if (fromTx) {
      return fromTx;
    }
    const stored =
      typeof reception?.documentNumber === 'string'
        ? reception.documentNumber.trim()
        : '';
    const dte =
      typeof reception?.dteNumber === 'string' ? reception.dteNumber.trim() : '';
    const ref =
      typeof reception?.reference === 'string' ? reception.reference.trim() : '';
    if (stored && stored !== dte && stored !== ref) {
      return stored;
    }
    if (stored && /^(CMP|COMPRA)-/i.test(stored)) {
      return stored;
    }
    return null;
  }

  /** Persiste folio CMP en recepciones antiguas que solo tenían referencia DTE en documentNumber. */
  private queuePersistReceptionFolio(
    receptionId: string,
    folio: string,
    reception: { documentNumber?: string | null; dteNumber?: string | null },
  ): void {
    const stored =
      typeof reception.documentNumber === 'string'
        ? reception.documentNumber.trim()
        : '';
    const dte =
      typeof reception.dteNumber === 'string' ? reception.dteNumber.trim() : '';
    if (stored === folio) {
      return;
    }
    if (stored && stored !== dte && /^(CMP|COMPRA)-/i.test(stored)) {
      return;
    }
    void this.receptionRepo
      .update({ id: receptionId }, { documentNumber: folio })
      .catch((err) => {
        this.logger.warn(
          `No se pudo persistir folio en recepción ${receptionId}: ${(err as Error).message}`,
        );
      });
  }

  private extractReceptionIdFromTransactionMetadata(
    metadata: unknown,
  ): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    const links = (metadata as { links?: unknown }).links;
    if (!links || typeof links !== 'object') {
      return null;
    }
    const id = (links as { receptionId?: unknown }).receptionId;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  }

  /** Persiste neto / IVA / total del DTE en la entidad recepción (factura o boleta). */
  private applySupplierFiscalTotalsToReception(
    reception: { subtotal?: number; taxAmount?: number; total?: number },
    data: any,
    docTypeNorm: string | null | undefined,
  ): void {
    const norm = docTypeNorm?.toString().trim().toLowerCase();
    if (norm !== 'invoice' && norm !== 'receipt') {
      return;
    }
    const fa = data?.supplierFiscalAmounts;
    if (!fa || typeof fa !== 'object') {
      return;
    }
    const subtotalNeto = this.roundClp((fa as { subtotalNeto?: unknown }).subtotalNeto);
    const taxAmount = this.roundClp((fa as { taxAmount?: unknown }).taxAmount);
    const totalDoc = this.roundClp((fa as { total?: unknown }).total);
    if (subtotalNeto <= 0 || totalDoc <= 0) {
      return;
    }
    reception.subtotal = subtotalNeto;
    reception.taxAmount = taxAmount;
    reception.total = totalDoc;
  }

  private resolveReceptionFiscalTotals(
    reception: any,
    fiscalTotals?: { subtotal: number; taxAmount: number; total: number } | null,
  ): { subtotal: number; taxAmount: number; total: number } {
    const dteType =
      typeof reception?.dteType === 'string'
        ? reception.dteType.trim().toLowerCase()
        : '';
    const storedSubtotal = Number(reception?.subtotal) || 0;
    const storedTax = Number(reception?.taxAmount) || 0;
    const storedTotal = Number(reception?.total) || 0;

    if (
      fiscalTotals &&
      (dteType === 'invoice' || dteType === 'receipt') &&
      (storedTax <= 0 || storedTotal <= storedSubtotal)
    ) {
      return {
        subtotal: fiscalTotals.subtotal,
        taxAmount: fiscalTotals.taxAmount,
        total: fiscalTotals.total,
      };
    }
    return {
      subtotal: storedSubtotal,
      taxAmount: storedTax,
      total: storedTotal,
    };
  }

  /** Totales del documento fiscal proveedor vinculado por `metadata.links.receptionId`. */
  private async loadFiscalTotalsByReceptionIds(
    receptionIds: string[],
  ): Promise<
    Map<string, { subtotal: number; taxAmount: number; total: number }>
  > {
    const ids = [
      ...new Set(
        receptionIds.filter((id) => typeof id === 'string' && id.trim()),
      ),
    ];
    const result = new Map<
      string,
      { subtotal: number; taxAmount: number; total: number }
    >();
    if (ids.length === 0) {
      return result;
    }

    const txs = await this.transactionRepo
      .createQueryBuilder('tx')
      .select([
        'tx.subtotal',
        'tx.taxAmount',
        'tx.total',
        'tx.metadata',
        'tx.createdAt',
      ])
      .where('tx.transactionType IN (:...types)', {
        types: [
          TransactionType.SUPPLIER_INVOICE,
          TransactionType.SUPPLIER_RECEIPT,
        ],
      })
      .andWhere(`(tx.metadata::jsonb #>> '{links,receptionId}') IN (:...ids)`, {
        ids,
      })
      .orderBy('tx.createdAt', 'DESC')
      .getMany();

    for (const tx of txs) {
      const receptionId = this.extractReceptionIdFromTransactionMetadata(
        tx.metadata,
      );
      if (!receptionId || result.has(receptionId)) {
        continue;
      }
      result.set(receptionId, {
        subtotal: Number(tx.subtotal) || 0,
        taxAmount: Number(tx.taxAmount) || 0,
        total: Number(tx.total) || 0,
      });
    }
    return result;
  }

  private mapReceptionListItem(
    reception: any,
    stockFolio?: string | null,
    purchaseOrderFolio?: string | null,
    fiscalTotals?: { subtotal: number; taxAmount: number; total: number } | null,
  ) {
    const folio = this.resolveReceptionFolio(reception, stockFolio);
    const reference =
      (typeof reception?.reference === 'string' && reception.reference.trim()) ||
      (typeof reception?.dteNumber === 'string' && reception.dteNumber.trim()) ||
      null;
    const dteType =
      typeof reception?.dteType === 'string' && reception.dteType.trim()
        ? reception.dteType.trim().toLowerCase()
        : null;
    const supplierDocumentRef =
      reception?.dteNumber ||
      reception?.reference ||
      null;
    const amounts = this.resolveReceptionFiscalTotals(reception, fiscalTotals);

    return {
      ...reception,
      transactionType: TransactionType.ADJUSTMENT_IN,
      status: TransactionStatus.RECEIVED,
      supplierName: this.getSupplierDisplayName(reception),
      supplierDni: this.getSupplierDni(reception),
      storageName: this.getStorageDisplayName(reception),
      folio,
      documentNumber: folio,
      dteType,
      reference,
      supplierDocumentRef,
      subtotal: amounts.subtotal,
      taxAmount: amounts.taxAmount,
      total: amounts.total,
      purchaseOrderNumber:
        reception?.type === 'from-purchase-order'
          ? (typeof purchaseOrderFolio === 'string' && purchaseOrderFolio.trim()) ||
            null
          : null,
    };
  }

  async search(
    opts: { limit?: number; offset?: number; search?: string } = {
      limit: 25,
      offset: 0,
    },
  ) {
    const { limit = 25, offset = 0 } = opts;
    const term = typeof opts.search === 'string' ? opts.search.trim() : '';
    const like = term ? `%${term}%` : null;

    const qb = this.receptionRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'lines')
      .leftJoinAndSelect('r.storage', 'storage')
      .leftJoinAndSelect('r.branch', 'branch')
      .leftJoinAndSelect('r.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.transaction', 'transaction');

    if (like) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('r.documentNumber ILIKE :like', { like })
            .orWhere('r.reference ILIKE :like', { like })
            .orWhere('r.dteNumber ILIKE :like', { like })
            .orWhere('r.notes ILIKE :like', { like })
            .orWhere('transaction.documentNumber ILIKE :like', { like })
            .orWhere('storage.name ILIKE :like', { like })
            .orWhere('supplier.alias ILIKE :like', { like })
            .orWhere('supplierPerson.businessName ILIKE :like', { like })
            .orWhere('supplierPerson.firstName ILIKE :like', { like })
            .orWhere('supplierPerson.lastName ILIKE :like', { like })
            .orWhere('supplierPerson.documentNumber ILIKE :like', { like });
        }),
      );
    }

    qb.orderBy('r.createdAt', 'DESC').take(limit).skip(offset);

    const [rows, count] = await qb.getManyAndCount();

    // Enrich returned rows with SKU/product names
    for (const r of rows) {
      // do not block on failures

      await this.enrichReceptionLines(r);
    }

    for (const r of rows) {
      if (!this.resolveReceptionFolio(r, null)) {
        await this.ensureReceptionStockFolio(r);
      }
    }

    const stockTxIds = rows
      .map((r) => r.transactionId)
      .filter((id): id is string => !!id);
    const folioByTxId = await this.loadStockFoliosByTransactionIds(stockTxIds);
    const poFolioByStockTxId =
      await this.loadPurchaseOrderFoliosByStockTransactionIds(stockTxIds);
    const fiscalTotalsByReceptionId = await this.loadFiscalTotalsByReceptionIds(
      rows.map((r) => String(r.id)),
    );

    const mappedRows = rows.map((row) => {
      const stockFolio =
        (row.transactionId && folioByTxId.get(row.transactionId)) ||
        row.transaction?.documentNumber ||
        null;
      const purchaseOrderFolio =
        (row.transactionId && poFolioByStockTxId.get(row.transactionId)) ||
        null;
      const fiscalTotals = fiscalTotalsByReceptionId.get(String(row.id)) ?? null;
      const mapped = this.mapReceptionListItem(
        row,
        stockFolio,
        purchaseOrderFolio,
        fiscalTotals,
      );
      if (mapped.folio && row.id) {
        this.queuePersistReceptionFolio(String(row.id), mapped.folio, row);
      }
      return mapped;
    });

    return {
      rows: mappedRows,
      count,
      limit,
      offset,
    };
  }

  async getById(id: string) {
    const found = await this.receptionRepo.findOne({
      where: { id },
      relations: [
        'lines',
        'storage',
        'branch',
        'supplier',
        'supplier.person',
        'user',
        'transaction',
      ],
    });

    if (!found) throw new NotFoundException('Reception not found');
    await this.enrichReceptionLines(found);
    const stockFolio =
      (found.transactionId &&
        (await this.loadStockFoliosByTransactionIds([found.transactionId])).get(
          found.transactionId,
        )) ||
      found.transaction?.documentNumber ||
      null;
    const purchaseOrderFolio =
      (found.transactionId &&
        (
          await this.loadPurchaseOrderFoliosByStockTransactionIds([
            found.transactionId,
          ])
        ).get(found.transactionId)) ||
      null;
    const fiscalTotals =
      (await this.loadFiscalTotalsByReceptionIds([String(found.id)])).get(
        String(found.id),
      ) ?? null;
    const mapped = this.mapReceptionListItem(
      found,
      stockFolio,
      purchaseOrderFolio,
      fiscalTotals,
    );
    if (mapped.folio) {
      this.queuePersistReceptionFolio(String(found.id), mapped.folio, found);
    }
    return mapped;
  }

  /**
   * Última recepción del proveedor cuya referencia, número de documento o DTE coincide con `documentRef`.
   * Usado en devoluciones para localizar la recepción asociada a una factura sin usar líneas del DTE.
   */
  /**
   * Devolución de compra: folio interno de recepción (CMP-…) o de documento fiscal (factura/boleta).
   * Factura y boleta resuelven la recepción vía `metadata.links.receptionId` del DTE proveedor.
   */
  async resolveForPurchaseReturn(opts: {
    source: 'reception' | 'invoice' | 'receipt';
    folio: string;
    supplierId?: string | null;
  }) {
    const folio = String(opts.folio ?? '').trim();
    const supplierId =
      typeof opts.supplierId === 'string' && opts.supplierId.trim()
        ? opts.supplierId.trim()
        : null;

    if (!folio) {
      throw new BadRequestException('folio is required');
    }

    if (opts.source === 'reception') {
      const qb = this.receptionRepo
        .createQueryBuilder('r')
        .leftJoin('r.transaction', 'tx')
        .where('(r.documentNumber = :folio OR tx.documentNumber = :folio)', {
          folio,
        });
      if (supplierId) {
        qb.andWhere('r.supplierId = :sid', { sid: supplierId });
      }
      const found = await qb.orderBy('r.createdAt', 'DESC').getOne();
      if (!found?.id) {
        throw new NotFoundException(
          'No se encontró recepción con ese folio interno.',
        );
      }
      return this.getById(String(found.id));
    }

    const fiscalType =
      opts.source === 'invoice'
        ? TransactionType.SUPPLIER_INVOICE
        : TransactionType.SUPPLIER_RECEIPT;

    const fiscalQb = this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.transactionType = :fiscalType', { fiscalType })
      .andWhere('tx.documentNumber = :folio', { folio });
    if (supplierId) {
      fiscalQb.andWhere('tx.supplierId = :sid', { sid: supplierId });
    }
    const fiscalTx = await fiscalQb.orderBy('tx.createdAt', 'DESC').getOne();
    if (!fiscalTx?.id) {
      throw new NotFoundException(
        opts.source === 'invoice'
          ? 'No se encontró factura de proveedor con ese folio.'
          : 'No se encontró boleta de proveedor con ese folio.',
      );
    }

    const receptionId = this.extractReceptionIdFromTransactionMetadata(
      fiscalTx.metadata,
    );
    if (!receptionId) {
      throw new NotFoundException(
        'El documento fiscal no tiene recepción de compra asociada.',
      );
    }
    return this.getById(receptionId);
  }

  async getBySupplierDocumentRef(supplierId: string, documentRef: string) {
    const sid = String(supplierId ?? '').trim();
    const ref = String(documentRef ?? '').trim();
    if (!sid) {
      throw new BadRequestException('supplierId is required');
    }
    if (!ref) {
      throw new BadRequestException('documentRef is required');
    }

    const found = await this.receptionRepo
      .createQueryBuilder('r')
      .where('r.supplierId = :sid', { sid })
      .andWhere(
        '(r.reference = :ref OR r.documentNumber = :ref OR r.dteNumber = :ref)',
        { ref },
      )
      .orderBy('r.createdAt', 'DESC')
      .getOne();

    if (!found?.id) {
      throw new NotFoundException(
        'No se encontró recepción para ese proveedor y referencia de documento.',
      );
    }
    return this.getById(String(found.id));
  }

  private async maybeCreateStockInTransaction(
    reception: any,
    opts?: { purchaseOrderId?: string | null },
  ) {
    try {
      await this.ensureReceptionStockFolio(reception);

      const branchId = await this.resolveBranchIdForReception(reception);
      if (!branchId) {
        this.logger.warn(
          'Could not determine branchId for reception, skipping transaction creation',
        );
        return null;
      }

      // Build transaction DTO (stock movement)
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PURCHASE;
      dto.branchId = branchId;
      const presetFolio =
        typeof reception.documentNumber === 'string'
          ? reception.documentNumber.trim()
          : '';
      if (presetFolio && /^(CMP|COMPRA)-/i.test(presetFolio)) {
        dto.documentNumber = presetFolio;
      }
      let resolvedUserId = reception.userId;
      if (!resolvedUserId) {
        const fallbackUser = await this.userRepo.findOne({ where: {} });
        if (fallbackUser?.id) {
          resolvedUserId = fallbackUser.id;
          this.logger.log(
            `Falling back to user ${resolvedUserId} for reception transaction`,
          );
        }
      }

      if (!resolvedUserId) {
        this.logger.warn(
          'Could not determine userId for reception, skipping transaction creation',
        );
        return null;
      }

      dto.userId = resolvedUserId;
      const receptionSupplierId =
        typeof reception.supplierId === 'string' && reception.supplierId.trim()
          ? reception.supplierId.trim()
          : null;
      if (!receptionSupplierId) {
        this.logger.warn(
          `Reception ${reception.id} sin supplierId; no se puede crear PURCHASE de stock`,
        );
        return { error: 'La recepción no tiene proveedor asociado.' } as any;
      }
      dto.supplierId = receptionSupplierId;
      dto.storageId = reception.storageId || null;
      dto.subtotal = 0;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = 0;
      dto.lines = [];
      dto.notes = reception.notes || null;
      const dteNum =
        (reception.dteNumber && String(reception.dteNumber).trim()) ||
        (reception.documentNumber && String(reception.documentNumber).trim()) ||
        null;
      dto.externalReference =
        dteNum || reception.reference || reception.documentNumber || null;

      const dteTypeNorm =
        reception.dteType && String(reception.dteType).trim().toLowerCase();

      // Attach reception-specific metadata so consumers can identify origin
      dto.metadata = {
        origin: 'RECEPTION',
        receptionId: reception.id,
        receptionType: reception.type || 'direct',
        storageId: reception.storageId || null,
        supplierId: reception.supplierId || null,
        reference: dteNum,
        document_type: dteTypeNorm || null,
        links: {
          purchaseOrderId:
            (typeof opts?.purchaseOrderId === 'string' && opts.purchaseOrderId.trim()) ||
            null,
        },
      } as any;

      // Payment plan is financial and should be handled by Supplier Invoice / AP, not by stock movement.

      // Ensure lines are loaded before mapping
      if (!Array.isArray(reception.lines) || reception.lines.length === 0) {
        const loadedLines = await this.receptionLineRepo.find({
          where: { receptionId: reception.id },
        });
        if (loadedLines.length > 0) {
          reception.lines = loadedLines;
        }
      }

      // Map reception lines to transaction lines
      if (Array.isArray(reception.lines)) {
        for (const l of reception.lines) {
          const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
          if (qty <= 0) {
            continue;
          }
          const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
          const unitCost = Number(l.unitCost ?? l.unitPrice ?? 0) || 0;
          const lineSubtotal = qty * (unitCost > 0 ? unitCost : unitPrice);
          const tline: CreateTransactionLineDto = {
            productId: l.productId || undefined,
            productVariantId: l.productVariantId || undefined,
            productName: l.productName || l.product?.name || 'Item',
            productSku: l.sku || l.productSku || undefined,
            variantName: l.variantName || undefined,
            quantity: qty,
            // Valorización de inventario: costo unitario de compra (unitCost o precio de línea)
            unitPrice: unitCost > 0 ? unitCost : unitPrice,
            unitCost,
            discountPercentage: 0,
            discountAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            subtotal: Number(lineSubtotal),
            total: Number(lineSubtotal),
          } as any;
          dto.lines.push(tline);
          dto.subtotal += lineSubtotal;
          dto.total += lineSubtotal;
        }
      }

      // If there are payments attached in the reception, and the reception isn't fully paid,
      // we still create the PURCHASE transaction (accounts payable will be generated by accounting engine)

      if ((dto.lines?.length ?? 0) === 0) {
        this.logger.warn(
          'Reception has no lines, skipping transaction creation',
        );
        return null;
      }

      // Create inventory transaction
      const created = await this.transactionsService.createTransaction(dto);
      this.logger.log(
        `Created PURCHASE transaction ${created.id} for reception ${reception.id}`,
      );
      // Persist link back to reception object (in-memory) for UI and diagnostics
      try {
        reception.transactionId = created.id;
        const txFolio =
          typeof created.documentNumber === 'string'
            ? created.documentNumber.trim()
            : '';
        if (txFolio) {
          reception.documentNumber = txFolio;
        }
        reception.transaction = {
          id: created.id,
          documentNumber: created.documentNumber,
        } as any;
      } catch (err) {
        // best-effort
      }
      return created;
    } catch (err) {
      const msg = (err as Error).message || 'unknown error';
      this.logger.error(
        'Error creating purchase transaction for reception: ' + msg,
      );
      return { error: msg } as any;
    }
  }

  async create(data: any) {
    const refFromPayload =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNorm =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    // Create reception entity
    const reception = this.receptionRepo.create({
      type: data.type || 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayload,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayload || data.dteNumber || null,
      dteType: docTypeNorm,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals and lineCount
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }

    // Save reception to database
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save reception lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? l.unitPrice ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Try to create corresponding PURCHASE transaction (best-effort)
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!);
    if (tx && tx.id) {
      receptionWithLines!.transactionId = tx.id;
      const txFolio =
        typeof (tx as any).documentNumber === 'string'
          ? String((tx as any).documentNumber).trim()
          : '';
      if (txFolio) {
        receptionWithLines!.documentNumber = txFolio;
      }
      await this.receptionRepo.save(receptionWithLines!);
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: tx && tx.id ? { id: tx.id } : null,
      transactionError: tx && tx.error ? tx.error : null,
    };
  }

  async createDirect(data: any) {
    await this.assertPosCashSessionForReception(data);

    const purchaseOrderId =
      typeof data.purchaseOrderId === 'string' && data.purchaseOrderId.trim()
        ? data.purchaseOrderId.trim()
        : null;

    // Create reception entity
    const refFromPayload =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNorm =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    const reception = this.receptionRepo.create({
      type: purchaseOrderId ? 'from-purchase-order' : 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayload,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayload || data.dteNumber || null,
      dteType: docTypeNorm,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals (líneas); factura/boleta usa montos fiscales del DTE
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }
    this.applySupplierFiscalTotalsToReception(reception, data, docTypeNorm);

    // Save reception
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? l.unitPrice ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Create PURCHASE transaction
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!, {
      purchaseOrderId,
    });
    const stockTxId = tx && (tx as any).id ? String((tx as any).id) : null;
    if (stockTxId) {
      receptionWithLines!.transactionId = stockTxId as any;
      const txFolio =
        typeof (tx as any).documentNumber === 'string'
          ? String((tx as any).documentNumber).trim()
          : '';
      if (txFolio) {
        receptionWithLines!.documentNumber = txFolio;
      }
      await this.receptionRepo.save(receptionWithLines!);
    }

    let supplierDocumentError: string | null = null;
    if (docTypeNorm === 'invoice' || docTypeNorm === 'receipt') {
      try {
        supplierDocumentError = await this.tryCreateReceptionSupplierFiscalDocuments({
          data,
          reception: receptionWithLines!,
          docTypeNorm: String(docTypeNorm),
          stockInTransactionId: stockTxId,
        });
        if (!supplierDocumentError) {
          this.applySupplierFiscalTotalsToReception(
            receptionWithLines!,
            data,
            docTypeNorm,
          );
          await this.receptionRepo.save(receptionWithLines!);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Supplier fiscal from reception failed: ${msg}`);
        supplierDocumentError = msg;
      }
    }

    const lineCount = receptionWithLines?.lines?.length ?? 0;
    let transactionError: string | null =
      tx && (tx as any).error ? String((tx as any).error) : null;
    if (!stockTxId && lineCount > 0) {
      transactionError =
        transactionError ||
        'No se creó la transacción de ingreso de stock; el inventario y el PMP no se actualizaron.';
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: stockTxId ? { id: stockTxId } : null,
      transactionError,
      supplierDocumentError,
    };
  }

  async createFromPurchaseOrder(data: any) {
    // Create reception entity
    const refFromPayloadPo =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNormPo =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    const reception = this.receptionRepo.create({
      type: 'from-purchase-order',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayloadPo,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayloadPo || data.dteNumber || null,
      dteType: docTypeNormPo,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }

    // Save reception
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? l.unitPrice ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Create PURCHASE transaction
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!);
    if (tx && tx.id) {
      receptionWithLines!.transactionId = tx.id;
      const txFolio =
        typeof (tx as any).documentNumber === 'string'
          ? String((tx as any).documentNumber).trim()
          : '';
      if (txFolio) {
        receptionWithLines!.documentNumber = txFolio;
      }
      await this.receptionRepo.save(receptionWithLines!);
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: tx && tx.id ? { id: tx.id } : null,
      transactionError: tx && tx.error ? tx.error : null,
    };
  }

  private roundClp(n: unknown): number {
    return Math.round(Number(n) || 0);
  }

  private mapUiPaymentMethod(raw: unknown): PaymentMethod {
    const s = String(raw || '').toUpperCase();
    if (s === 'CASH') return PaymentMethod.CASH;
    if (s === 'CHECK') return PaymentMethod.CHECK;
    return PaymentMethod.TRANSFER;
  }

  private normalizeSupplierDocumentPayment(raw: unknown): {
    mode: string;
    partialPaidAmount?: number;
    paidLines: any[];
    scheduledLines: any[];
  } {
    if (!raw || typeof raw !== 'object') {
      return { mode: 'PENDING', paidLines: [], scheduledLines: [] };
    }
    const o = raw as Record<string, unknown>;
    const modeRaw = String(o.mode || 'PENDING').toUpperCase();
    const mode = ['PENDING', 'PENDING_SCHEDULED', 'PARTIAL', 'COMPLETED'].includes(
      modeRaw,
    )
      ? modeRaw
      : 'PENDING';
    const paidLines = Array.isArray(o.paidLines) ? o.paidLines : [];
    const scheduledLines = Array.isArray(o.scheduledLines) ? o.scheduledLines : [];
    return {
      mode,
      partialPaidAmount:
        o.partialPaidAmount != null ? this.roundClp(o.partialPaidAmount) : undefined,
      paidLines,
      scheduledLines,
    };
  }

  private validatePaymentLine(
    l: any,
    label: string,
    opts?: { posCashSessionId?: string | null; isScheduledLine?: boolean },
  ): string | null {
    const due = typeof l?.dueDate === 'string' ? l.dueDate.trim() : '';
    const amount = this.roundClp(l?.amount);
    if (!due) return `${label}: fecha de vencimiento requerida.`;
    if (amount <= 0) return `${label}: monto inválido.`;
    if (opts?.isScheduledLine) {
      return null;
    }
    const pm = String(l?.paymentMethod || '').toUpperCase();
    if (!['CASH', 'TRANSFER', 'CHECK'].includes(pm))
      return `${label}: medio de pago inválido.`;
    if (pm === 'CASH') {
      const posSessionId = opts?.posCashSessionId?.trim() || '';
      if (posSessionId) {
        const hub = typeof l?.cashHubId === 'string' ? l.cashHubId.trim() : '';
        if (hub) {
          return `${label}: en POS el efectivo sale de la caja; no use centro de acopio.`;
        }
        if (!opts?.isScheduledLine) {
          const lineSession =
            typeof l?.cashSessionId === 'string' ? l.cashSessionId.trim() : '';
          if (!lineSession && !posSessionId) {
            return `${label}: efectivo en POS requiere sesión de caja.`;
          }
        }
      } else {
        const hub = typeof l?.cashHubId === 'string' ? l.cashHubId.trim() : '';
        if (!hub) return `${label}: efectivo requiere centro de acopio (cashHubId).`;
      }
    }
    if (pm === 'TRANSFER' || pm === 'CHECK') {
      const c = l?.companyBankAccountKey;
      if (c == null || String(c).trim() === '')
        return `${label}: transferencia/cheque requiere cuenta empresa.`;
    }
    if (pm === 'CHECK') {
      const ch = l?.chequeNumber;
      if (ch == null || String(ch).trim() === '')
        return `${label}: cheque requiere número.`;
    }
    return null;
  }

  private toPlannedPaymentMeta(
    line: any,
    posCashSessionId?: string | null,
    opts?: { isScheduled?: boolean },
  ) {
    const dueDate = String(line?.dueDate || '').trim();
    const amount = this.roundClp(line?.amount);
    const pm = String(line?.paymentMethod || '').toUpperCase();
    if (opts?.isScheduled && !pm) {
      return { dueDate, amount };
    }
    const lineSession =
      pm === 'CASH' && line?.cashSessionId != null
        ? String(line.cashSessionId).trim()
        : null;
    const sessionId =
      lineSession || (pm === 'CASH' && posCashSessionId ? posCashSessionId.trim() : null);
    return {
      dueDate,
      amount,
      ...(pm ? { paymentMethod: pm } : {}),
      companyBankAccountKey:
        pm === 'TRANSFER' || pm === 'CHECK'
          ? line?.companyBankAccountKey != null
            ? String(line.companyBankAccountKey)
            : null
          : null,
      supplierBankAccountKey:
        pm === 'TRANSFER'
          ? line?.supplierBankAccountKey != null
            ? String(line.supplierBankAccountKey)
            : null
          : null,
      chequeNumber:
        pm === 'CHECK' && line?.chequeNumber != null
          ? String(line.chequeNumber).trim()
          : null,
      cashHubId:
        pm === 'CASH' && !sessionId && line?.cashHubId != null
          ? String(line.cashHubId).trim()
          : null,
      cashSessionId: sessionId || null,
      paymentSource: sessionId ? 'pos_cash_session' : pm === 'CASH' ? 'cash_hub' : null,
    };
  }

  private sumLineAmounts(lines: any[]): number {
    return lines.reduce((s, l) => s + this.roundClp((l as any)?.amount), 0);
  }

  private validateReceptionSupplierPaymentPlan(
    payment: {
      mode: string;
      partialPaidAmount?: number;
      paidLines: any[];
      scheduledLines: any[];
    },
    docTotal: number,
    posCashSessionId?: string | null,
  ): string | null {
    const eps = 2;
    const { mode } = payment;
    const paid = payment.paidLines as any[];
    const sched = payment.scheduledLines as any[];

    for (let i = 0; i < paid.length; i++) {
      const err = this.validatePaymentLine(paid[i], `Abono ${i + 1}`, {
        posCashSessionId,
        isScheduledLine: false,
      });
      if (err) return err;
    }
    for (let i = 0; i < sched.length; i++) {
      const err = this.validatePaymentLine(sched[i], `Cuota ${i + 1}`, {
        posCashSessionId,
        isScheduledLine: true,
      });
      if (err) return err;
    }

    if (mode === 'PENDING') {
      if (paid.length || sched.length) {
        return 'Modo pendiente: no debe incluir líneas de pago.';
      }
      return null;
    }

    if (mode === 'PENDING_SCHEDULED') {
      if (paid.length) return 'Pago pendiente con cuotas: no debe incluir abonos ejecutados.';
      if (!sched.length) return 'Indique al menos una cuota programada.';
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(sumS - docTotal) > eps) {
        return `Las cuotas (${sumS}) deben sumar el total del documento (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'COMPLETED') {
      if (!paid.length) return 'Pago completado: defina la línea de pago.';
      if (sched.length) return 'Pago completado: no debe incluir cuotas pendientes adicionales.';
      const sumP = this.sumLineAmounts(paid);
      if (Math.abs(sumP - docTotal) > eps) {
        return `El pago (${sumP}) debe igualar el total (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'PARTIAL') {
      const part = this.roundClp(payment.partialPaidAmount ?? 0);
      const sumP = this.sumLineAmounts(paid);
      if (Math.abs(sumP - part) > eps) {
        return `Los abonos (${sumP}) deben coincidir con el monto parcial indicado (${part}).`;
      }
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(part + sumS - docTotal) > eps) {
        return 'Abonos + saldo programado deben igualar el total del documento.';
      }
      if (!paid.length) return 'Pago parcial: agregue al menos un abono ejecutado.';
      if (part < docTotal - eps && !sched.length) {
        return 'Pago parcial: indique las cuotas para el saldo pendiente.';
      }
      return null;
    }

    return null;
  }

  private async createSupplierPaymentLine(opts: {
    dtoHost: any;
    fiscalDocId: string;
    line: any;
    asDraft: boolean;
    note: string;
    installmentNumber?: number;
    totalInstallments?: number;
  }): Promise<void> {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SUPPLIER_PAYMENT;
    if (opts.asDraft) {
      dto.transactionStatus = TransactionStatus.DRAFT;
    }
    dto.branchId = opts.dtoHost.branchId;
    dto.userId = opts.dtoHost.userId;
    dto.supplierId = opts.dtoHost.supplierId;
    dto.relatedTransactionId = opts.fiscalDocId;
    dto.subtotal = this.roundClp(opts.line.amount);
    dto.discountAmount = 0;
    dto.taxAmount = 0;
    dto.total = this.roundClp(opts.line.amount);
    dto.amountPaid = opts.asDraft ? 0 : this.roundClp(opts.line.amount);
    dto.paymentStatus = opts.asDraft ? PaymentStatus.PENDING : PaymentStatus.PAID;
    dto.paymentDueDate = String(opts.line.dueDate || '').trim();
    const pm = String(opts.line?.paymentMethod || '').toUpperCase();
    if (pm && ['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
      dto.paymentMethod = this.mapUiPaymentMethod(pm);
      if (pm === 'TRANSFER' || pm === 'CHECK') {
        dto.bankAccountKey =
          opts.line.companyBankAccountKey != null
            ? String(opts.line.companyBankAccountKey).trim()
            : undefined;
      }
      const posSessionId = this.resolvePosCashSessionId(opts.dtoHost);
      if (pm === 'CASH') {
        const lineSession =
          typeof opts.line?.cashSessionId === 'string'
            ? opts.line.cashSessionId.trim()
            : '';
        const sessionId = lineSession || posSessionId || '';
        if (sessionId) {
          dto.cashSessionId = sessionId;
          const posId =
            typeof opts.dtoHost?.pointOfSaleId === 'string'
              ? opts.dtoHost.pointOfSaleId.trim()
              : '';
          if (posId) {
            dto.pointOfSaleId = posId;
          }
        } else if (opts.line.cashHubId != null) {
          dto.cashHubId = String(opts.line.cashHubId).trim();
        }
      }
    }
    dto.notes = opts.note;
    const posSessionId = this.resolvePosCashSessionId(opts.dtoHost);
    dto.metadata = {
      origin: 'RECEPTION_SUPPLIER_PAYMENT',
      installmentNumber: opts.installmentNumber ?? 1,
      totalInstallments: opts.totalInstallments ?? 1,
      receptionSupplierPaymentLine: this.toPlannedPaymentMeta(
        opts.line,
        posSessionId,
        { isScheduled: opts.asDraft },
      ),
    };
    await this.transactionsService.createTransaction(dto);
  }

  private async tryCreateReceptionSupplierFiscalDocuments(opts: {
    data: any;
    reception: any;
    docTypeNorm: string;
    stockInTransactionId: string | null;
  }): Promise<string | null> {
    const { data, reception, docTypeNorm, stockInTransactionId } = opts;

    const fa = data?.supplierFiscalAmounts;
    if (!fa || typeof fa !== 'object') {
      return 'Faltan montos del documento fiscal (supplierFiscalAmounts).';
    }

    const subtotalNeto = this.roundClp((fa as any).subtotalNeto);
    const taxAmount = this.roundClp((fa as any).taxAmount);
    const totalDoc = this.roundClp((fa as any).total);
    const taxIdRaw = (fa as any).taxId;
    const taxId =
      typeof taxIdRaw === 'string' && taxIdRaw.trim().length ? taxIdRaw.trim() : undefined;
    let taxRatePct = Number((fa as any).taxRatePct);
    if (!Number.isFinite(taxRatePct) || taxRatePct < 0) taxRatePct = 0;
    if (taxRatePct > 100) taxRatePct = 100;

    if (subtotalNeto <= 0 || totalDoc <= 0) {
      return 'Montos del documento fiscal inválidos.';
    }
    if (Math.abs(subtotalNeto + taxAmount - totalDoc) > 2) {
      return 'Neto + impuestos no coincide con el total del documento.';
    }

    const payment = this.normalizeSupplierDocumentPayment(
      data?.supplierDocumentPayment ?? null,
    );
    const posCashSessionId = this.resolvePosCashSessionId(data);

    const planErr = this.validateReceptionSupplierPaymentPlan(
      payment,
      totalDoc,
      posCashSessionId,
    );
    if (planErr) {
      return planErr;
    }

    const fiscalDto = new CreateTransactionDto();
    fiscalDto.transactionType =
      docTypeNorm === 'invoice'
        ? TransactionType.SUPPLIER_INVOICE
        : TransactionType.SUPPLIER_RECEIPT;
    fiscalDto.branchId = data.branchId;
    fiscalDto.userId = data.userId;
    fiscalDto.supplierId = data.supplierId;
    fiscalDto.storageId = reception.storageId || undefined;
    fiscalDto.subtotal = subtotalNeto;
    fiscalDto.taxAmount = taxAmount;
    fiscalDto.discountAmount = 0;
    fiscalDto.total = totalDoc;

    const ref =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof reception.reference === 'string' && reception.reference.trim()) ||
      '';
    applyDteNumberToSupplierDocumentDto(
      { dteNumber: ref, metadata: { dteNumber: ref } },
      fiscalDto,
    );

    let parentPaymentStatus = PaymentStatus.PENDING;
    let parentAmountPaid = 0;
    const paid = payment.paidLines as any[];
    const sched = payment.scheduledLines as any[];

    let plannedForMeta: any[] = [];

    if (payment.mode === 'COMPLETED') {
      parentPaymentStatus = PaymentStatus.PAID;
      parentAmountPaid = totalDoc;
      plannedForMeta = paid.map((l) =>
        this.toPlannedPaymentMeta(l, posCashSessionId),
      );
    } else if (payment.mode === 'PARTIAL') {
      parentPaymentStatus = PaymentStatus.PARTIAL;
      parentAmountPaid = this.sumLineAmounts(paid);
      plannedForMeta = [...paid, ...sched].map((l, i) =>
        this.toPlannedPaymentMeta(l, posCashSessionId, {
          isScheduled: i >= paid.length,
        }),
      );
    } else if (payment.mode === 'PENDING_SCHEDULED') {
      parentPaymentStatus = PaymentStatus.PENDING;
      parentAmountPaid = 0;
      plannedForMeta = sched.map((l) =>
        this.toPlannedPaymentMeta(l, posCashSessionId, { isScheduled: true }),
      );
    } else {
      parentPaymentStatus = PaymentStatus.PENDING;
      parentAmountPaid = 0;
      plannedForMeta = [];
    }

    const methodSource = paid[0]?.paymentMethod;
    if (methodSource) {
      fiscalDto.paymentMethod = this.mapUiPaymentMethod(methodSource);
    }
    fiscalDto.paymentStatus = parentPaymentStatus;
    fiscalDto.amountPaid = parentAmountPaid;

    const line = new CreateTransactionLineDto();
    line.productName =
      docTypeNorm === 'invoice'
        ? 'Factura proveedor (recepción)'
        : 'Boleta proveedor (recepción)';
    line.quantity = 1;
    line.unitPrice = subtotalNeto;
    line.subtotal = subtotalNeto;
    line.taxAmount = taxAmount;
    line.total = totalDoc;
    line.taxRate = taxRatePct;
    if (taxId) {
      line.taxId = taxId;
    }

    fiscalDto.lines = [line];

    fiscalDto.metadata = {
      origin: docTypeNorm === 'invoice' ? 'SUPPLIER_INVOICE' : 'SUPPLIER_RECEIPT',
      dteNumber: ref || undefined,
      links: {
        receptionId: reception.id,
        stockInTransactionId: stockInTransactionId,
        purchaseOrderId: null,
      },
      plannedPayments: plannedForMeta,
      receptionSupplierDocumentPayment: payment,
    };

    const created = await this.transactionsService.createTransaction(fiscalDto);
    const fiscalId = created?.id;
    if (!fiscalId) {
      return 'No se obtuvo id del documento fiscal creado.';
    }

    const totalPaymentLines =
      payment.mode === 'COMPLETED'
        ? paid.length
        : payment.mode === 'PARTIAL'
          ? paid.length + sched.length
          : payment.mode === 'PENDING_SCHEDULED'
            ? sched.length
            : 0;

    if (payment.mode === 'COMPLETED') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: paid[i],
          asDraft: false,
          note: `Pago documento recepción (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines || paid.length,
        });
      }
    } else if (payment.mode === 'PARTIAL') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: paid[i],
          asDraft: false,
          note: `Abono recepción (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines,
        });
      }
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada recepción (${i + 1}/${sched.length})`,
          installmentNumber: paid.length + i + 1,
          totalInstallments: totalPaymentLines,
        });
      }
    } else if (payment.mode === 'PENDING_SCHEDULED') {
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada recepción (${i + 1}/${sched.length})`,
          installmentNumber: i + 1,
          totalInstallments: sched.length,
        });
      }
    }

    if (totalPaymentLines > 0) {
      await this.parentPaymentAggregate.recalculateParentPaymentStatus(fiscalId);
    }

    if (posCashSessionId) {
      try {
        await this.cashSessionsService.refreshExpectedAmountForSession(
          posCashSessionId,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `No se pudo recalcular efectivo esperado de sesión ${posCashSessionId}: ${msg}`,
        );
      }
    }

    return null;
  }
}
