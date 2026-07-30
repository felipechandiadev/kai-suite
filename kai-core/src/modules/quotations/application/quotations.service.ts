import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { CreateTransactionCommand } from '@modules/transactions/application/commands/create-transaction.usecase';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  CancelQuotationDto,
  ConvertQuotationDto,
  CreateQuotationDto,
  ListQuotationsQueryDto,
} from './dto/quotation.dtos';

/**
 * Estado efectivo de una cotización (derivado al vuelo cuando aplica).
 *
 *  - ACTIVE: `status=CONFIRMED` y `validUntil >= now()`.
 *  - EXPIRED: `status=CONFIRMED` y `validUntil < now()` (o `status=EXPIRED`
 *    si se materializó por job).
 *  - CONVERTED: `status=COMPLETED` (siempre via `convert`).
 *  - CANCELLED: `status=CANCELLED`.
 */
export type EffectiveQuotationStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface QuotationRow {
  id: string;
  companyId: string;
  documentNumber: string;
  status: TransactionStatus;
  effectiveStatus: EffectiveQuotationStatus;
  branchId: string | null;
  pointOfSaleId: string | null;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  total: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  currency: string;
  issuedAt: string;
  validUntil: string;
  validityDays: number;
  terms: string | null;
  priceListId: string | null;
  convertedToTransactionId: string | null;
  convertedToDocumentNumber: string | null;
  convertedAt: string | null;
  notes: string | null;
  linesCount: number;
  createdAt: string;
}

export interface QuotationDetail extends QuotationRow {
  lines: Array<{
    id: string;
    lineNumber: number;
    productId: string | null;
    productVariantId: string | null;
    productName: string;
    productSku: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    subtotal: number;
    total: number;
    notes: string | null;
  }>;
}

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly lineRepository: Repository<TransactionLine>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly companiesService: CompaniesService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ============================================================
  // QUERIES
  // ============================================================

  async list(
    companyId: string,
    filters: ListQuotationsQueryDto,
  ): Promise<{
    items: QuotationRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const limit = Math.max(
      1,
      Math.min(200, parseInt(filters.limit || '25', 10) || 25),
    );

    const qb = this.txRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', {
        type: TransactionType.QUOTATION,
      });

    if (filters.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: filters.branchId });
    }
    if (filters.pointOfSaleId) {
      qb.andWhere('t.pointOfSaleId = :posId', {
        posId: filters.pointOfSaleId,
      });
    }
    if (filters.customerId) {
      qb.andWhere('t.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('t.createdAt >= :df', { df: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('t.createdAt <= :dt', { dt: filters.dateTo });
    }
    if (filters.search) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('t.documentNumber ILIKE :s', {
            s: `%${filters.search}%`,
          }).orWhere('t.notes ILIKE :s', { s: `%${filters.search}%` });
        }),
      );
    }
    if (filters.effectiveStatus) {
      const eff = filters.effectiveStatus.toUpperCase();
      const nowIso = new Date().toISOString();
      switch (eff) {
        case 'ACTIVE':
          qb.andWhere('t.status = :st', { st: TransactionStatus.CONFIRMED });
          qb.andWhere(
            "(t.metadata->'quotation'->>'validUntil') >= :now",
            { now: nowIso },
          );
          break;
        case 'EXPIRED':
          qb.andWhere(
            new Brackets((q) => {
              q.where('t.status = :stExp', {
                stExp: TransactionStatus.EXPIRED,
              }).orWhere(
                new Brackets((q2) => {
                  q2.where('t.status = :stConf', {
                    stConf: TransactionStatus.CONFIRMED,
                  }).andWhere(
                    "(t.metadata->'quotation'->>'validUntil') < :now",
                    { now: nowIso },
                  );
                }),
              );
            }),
          );
          break;
        case 'CONVERTED':
          qb.andWhere('t.status = :st', { st: TransactionStatus.COMPLETED });
          break;
        case 'CANCELLED':
          qb.andWhere('t.status = :st', { st: TransactionStatus.CANCELLED });
          break;
      }
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const items = rows.map((r) => this.toRow(r));

    return { items, total, page, limit };
  }

  async getById(companyId: string, id: string): Promise<QuotationDetail> {
    const tx = await this.txRepository.findOne({
      where: {
        id,
        companyId,
        transactionType: TransactionType.QUOTATION,
      },
    });
    if (!tx) throw new NotFoundException('Cotización no encontrada');

    const lines = await this.lineRepository.find({
      where: { transactionId: tx.id },
      order: { lineNumber: 'ASC' },
    });

    const row = this.toRow(tx);
    return {
      ...row,
      lines: lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        productId: l.productId ?? null,
        productVariantId: l.productVariantId ?? null,
        productName: l.productName,
        productSku: l.productSku ?? null,
        variantName: l.variantName ?? null,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountPercentage: Number(l.discountPercentage),
        discountAmount: Number(l.discountAmount),
        taxRate: Number(l.taxRate),
        taxAmount: Number(l.taxAmount),
        subtotal: Number(l.subtotal),
        total: Number(l.total),
        notes: l.notes ?? null,
      })),
    };
  }

  /**
   * Búsqueda por folio para uso en POS / admin.
   * Soporta `documentNumber` exacto. Devuelve null si no existe.
   */
  async findByDocumentNumber(
    companyId: string,
    documentNumber: string,
  ): Promise<QuotationDetail | null> {
    const tx = await this.txRepository.findOne({
      where: {
        documentNumber,
        companyId,
        transactionType: TransactionType.QUOTATION,
      },
    });
    if (!tx) return null;
    return this.getById(companyId, tx.id);
  }

  // ============================================================
  // COMMANDS
  // ============================================================

  /**
   * Crea una cotización: snapshot de líneas + folio COTYY#####.
   * Se persiste con `status=CONFIRMED` y vigencia derivada de la
   * configuración de empresa.
   */
  async create(
    companyId: string,
    userId: string,
    dto: CreateQuotationDto,
  ): Promise<QuotationDetail> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('La cotización requiere al menos una línea');
    }

    const cfg = await this.companiesService.getQuotationSettings(companyId);
    if (!cfg.enabled) {
      throw new ForbiddenException(
        'El módulo de cotizaciones está deshabilitado para esta empresa',
      );
    }

    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch || branch.companyId !== companyId) {
      throw new BadRequestException(
        'branchId inválido o no pertenece a la empresa actual',
      );
    }

    const now = new Date();
    const issuedAt = now.toISOString();
    const validUntil = this.resolveValidUntil(now, dto.validUntil, cfg);
    const validityDays = Math.ceil(
      (new Date(validUntil).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Calcular totales si no vienen
    const computed = this.computeLines(dto.lines);

    const txDto = new CreateTransactionDto();
    txDto.transactionType = TransactionType.QUOTATION;
    txDto.branchId = dto.branchId;
    txDto.userId = userId;
    txDto.customerId = dto.customerId ?? undefined;
    txDto.pointOfSaleId = dto.pointOfSaleId ?? undefined;
    txDto.subtotal = computed.subtotal;
    txDto.taxAmount = computed.taxAmount;
    txDto.discountAmount = computed.discountAmount;
    txDto.total = computed.total;
    txDto.notes = dto.notes ?? undefined;
    txDto.metadata = {
      origin: 'QUOTATION',
      quotation: {
        issuedAt,
        validUntil,
        validityDays,
        terms: dto.terms ?? cfg.defaultTerms ?? null,
        currency: dto.currency ?? 'CLP',
        priceListId: dto.priceListId ?? null,
        convertedToTransactionId: null,
        convertedToDocumentNumber: null,
        convertedAt: null,
      },
      customerSnapshot:
        dto.customerName || dto.customerDocument || dto.customerPhone
          ? {
              name: dto.customerName ?? null,
              document: dto.customerDocument ?? null,
              phone: dto.customerPhone ?? null,
            }
          : null,
      links: {},
    };
    txDto.lines = computed.lines.map((l) => ({
      productId: l.productId,
      productVariantId: l.productVariantId,
      unitId: l.unitId,
      taxId: l.taxId,
      productName: l.productName,
      productSku: l.productSku,
      variantName: l.variantName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
      discountPercentage: l.discountPercentage,
      discountAmount: l.discountAmount,
      taxRate: l.taxRate,
      taxAmount: l.taxAmount,
      subtotal: l.subtotal,
      total: l.total,
      notes: l.notes,
    })) as any;

    const created = await this.commandBus.execute(
      new CreateTransactionCommand(txDto),
    );

    return this.getById(companyId, (created as Transaction).id);
  }

  /**
   * Anula una cotización (estado CANCELLED). Sólo aplica si la cotización
   * no fue convertida.
   */
  async cancel(
    companyId: string,
    id: string,
    dto: CancelQuotationDto,
  ): Promise<QuotationDetail> {
    const tx = await this.txRepository.findOne({
      where: {
        id,
        companyId,
        transactionType: TransactionType.QUOTATION,
      },
    });
    if (!tx) throw new NotFoundException('Cotización no encontrada');

    if (tx.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'La cotización ya fue convertida y no puede anularse',
      );
    }
    if (tx.status === TransactionStatus.CANCELLED) {
      return this.getById(companyId, id);
    }

    tx.status = TransactionStatus.CANCELLED;
    tx.metadata = {
      ...(tx.metadata ?? {}),
      quotation: {
        ...(tx.metadata?.quotation ?? {}),
        cancelledAt: new Date().toISOString(),
        cancelReason: dto.reason ?? null,
      },
    };
    await this.txRepository.save(tx);
    return this.getById(companyId, id);
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private resolveValidUntil(
    now: Date,
    raw: string | undefined,
    cfg: { defaultValidityDays: number; maxValidityDays: number; allowCustomValidity: boolean },
  ): string {
    const addDays = (n: number) => {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() + n);
      // Final del día para que la cotización sea válida durante todo el día
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    };

    if (!raw || !cfg.allowCustomValidity) {
      return addDays(cfg.defaultValidityDays);
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
      return addDays(cfg.defaultValidityDays);
    }
    const diffDays = Math.ceil(
      (parsed.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays > cfg.maxValidityDays) {
      return addDays(cfg.maxValidityDays);
    }
    return parsed.toISOString();
  }

  /**
   * Calcula `subtotal/taxAmount/total` por línea cuando faltan, garantizando
   * que `Σ lines.total === total cabecera` (CreateTransactionDto exige
   * coherencia exacta hasta 0.01).
   */
  computeLines(rawLines: CreateQuotationDto['lines']): {
    lines: Array<{
      productId?: string;
      productVariantId?: string;
      unitId?: string;
      productName: string;
      productSku?: string;
      variantName?: string;
      taxId?: string;
      quantity: number;
      unitPrice: number;
      unitCost?: number;
      discountPercentage: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      subtotal: number;
      total: number;
      notes?: string;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  } {
    const lines = rawLines.map((l) => {
      const quantity = Number(l.quantity) || 0;
      const unitPrice = Number(l.unitPrice) || 0;
      const discountPercentage = Number(l.discountPercentage) || 0;
      const discountAmount =
        Number(l.discountAmount) ||
        Number(((unitPrice * quantity * discountPercentage) / 100).toFixed(2));
      const gross = unitPrice * quantity;
      const lineSubtotal = Number(
        (l.subtotal ?? Math.max(0, gross - discountAmount)).toFixed(2),
      );
      const taxRate = Number(l.taxRate) || 0;
      const taxAmount = Number(
        (l.taxAmount ?? lineSubtotal * (taxRate / 100)).toFixed(2),
      );
      const total = Number((l.total ?? lineSubtotal + taxAmount).toFixed(2));
      return {
        productId: l.productId,
        productVariantId: l.productVariantId,
        unitId: l.unitId,
        productName: l.productName,
        productSku: l.productSku,
        variantName: l.variantName,
        taxId: l.taxId,
        quantity,
        unitPrice,
        unitCost: l.unitCost,
        discountPercentage,
        discountAmount,
        taxRate,
        taxAmount,
        subtotal: lineSubtotal,
        total,
        notes: l.notes,
      };
    });

    const subtotal = Number(
      lines.reduce((acc, l) => acc + l.subtotal, 0).toFixed(2),
    );
    const taxAmount = Number(
      lines.reduce((acc, l) => acc + l.taxAmount, 0).toFixed(2),
    );
    const discountAmount = Number(
      lines.reduce((acc, l) => acc + l.discountAmount, 0).toFixed(2),
    );
    const total = Number(lines.reduce((acc, l) => acc + l.total, 0).toFixed(2));

    return { lines, subtotal, taxAmount, discountAmount, total };
  }

  toRow(tx: Transaction): QuotationRow {
    const meta = (tx.metadata ?? {}) as any;
    const q = meta.quotation ?? {};
    const customerSnap = meta.customerSnapshot ?? null;
    const validUntilIso: string =
      typeof q.validUntil === 'string'
        ? q.validUntil
        : new Date().toISOString();
    const issuedAtIso: string =
      typeof q.issuedAt === 'string'
        ? q.issuedAt
        : tx.createdAt
          ? new Date(tx.createdAt).toISOString()
          : new Date().toISOString();
    const now = Date.now();
    const validUntilMs = new Date(validUntilIso).getTime();

    let effectiveStatus: EffectiveQuotationStatus;
    if (tx.status === TransactionStatus.COMPLETED) {
      effectiveStatus = 'CONVERTED';
    } else if (tx.status === TransactionStatus.CANCELLED) {
      effectiveStatus = 'CANCELLED';
    } else if (tx.status === TransactionStatus.EXPIRED) {
      effectiveStatus = 'EXPIRED';
    } else if (
      tx.status === TransactionStatus.CONFIRMED &&
      Number.isFinite(validUntilMs) &&
      validUntilMs < now
    ) {
      effectiveStatus = 'EXPIRED';
    } else {
      effectiveStatus = 'ACTIVE';
    }

    return {
      id: tx.id,
      companyId: tx.companyId,
      documentNumber: tx.documentNumber,
      status: tx.status,
      effectiveStatus,
      branchId: tx.branchId ?? null,
      pointOfSaleId: tx.pointOfSaleId ?? null,
      customerId: tx.customerId ?? null,
      customerName: customerSnap?.name ?? null,
      customerDocument: customerSnap?.document ?? null,
      total: Number(tx.total),
      subtotal: Number(tx.subtotal),
      taxAmount: Number(tx.taxAmount),
      discountAmount: Number(tx.discountAmount),
      currency: typeof q.currency === 'string' ? q.currency : 'CLP',
      issuedAt: issuedAtIso,
      validUntil: validUntilIso,
      validityDays: Number(q.validityDays) || 0,
      terms: typeof q.terms === 'string' ? q.terms : null,
      priceListId: q.priceListId ?? null,
      convertedToTransactionId: q.convertedToTransactionId ?? null,
      convertedToDocumentNumber: q.convertedToDocumentNumber ?? null,
      convertedAt: q.convertedAt ?? null,
      notes: tx.notes ?? null,
      linesCount: 0,
      createdAt: tx.createdAt
        ? new Date(tx.createdAt).toISOString()
        : new Date().toISOString(),
    };
  }
}
