import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';
import type { TransactionBackorderMetadata } from '../domain/transaction-backorder.metadata';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { posDisplayStockInSaleUnits } from '@modules/product-variants/application/variant-count-bridge.util';

export type PosBackorderForFulfillLineDto = {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
  /** Símbolo de la unidad de venta (para mostrar en UI de carrito). */
  saleUnitSymbol: string | null;
  /** Símbolo de la unidad base de stock (para conversión interna). */
  stockBaseUnitSymbol: string | null;
  /** Factor de conversión: cuántas unidades base por 1 unidad de venta (conteo). */
  stockBaseQtyPerCountSaleUnit: number | null;
  /** Permite decimales en la unidad de venta. */
  unitAllowDecimals: boolean;
  /** Stock disponible en el almacén del POS, en unidades de venta. null si no controla inventario o no hay POS. */
  availableStock: number | null;
  /** Stock disponible en unidades base. null si no controla inventario. */
  availableStockBase: number | null;
};

export type PosBackorderForFulfillDto = {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  reservationStatus: string;
  depositAmount: number;
  depositConsumedAmount: number;
  depositAvailable: number;
  lines: PosBackorderForFulfillLineDto[];
};

const BLOCKED_STATUSES = new Set<string>([
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.DRAFT,
]);

@Injectable()
export class PosBackorderLookupService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findBackorderByDocumentNumber(
    companyId: string,
    documentNumber: string,
    pointOfSaleId?: string | null,
  ): Promise<PosBackorderForFulfillDto | null> {
    const folio = documentNumber?.trim();
    if (!folio) {
      throw new BadRequestException('Folio de reserva requerido');
    }

    const tx = await this.transactionRepository.findOne({
      where: {
        companyId,
        documentNumber: folio,
        transactionType: TransactionType.BACKORDER,
      },
      relations: [
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
        'customer',
        'customer.person',
        'branch',
        'pointOfSale',
      ],
    });

    if (!tx) return null;

    if (BLOCKED_STATUSES.has(String(tx.status))) {
      throw new BadRequestException(
        `La reserva ${folio} no está disponible (estado: ${tx.status}).`,
      );
    }

    const bo = (tx.metadata?.backorder ?? {}) as TransactionBackorderMetadata;
    const status = String(bo.reservationStatus ?? 'OPEN').toUpperCase();
    if (status !== 'OPEN') {
      throw new BadRequestException(
        `La reserva ${folio} ya no está abierta (estado: ${status}).`,
      );
    }

    return this.toPosDto(tx, bo, pointOfSaleId ?? null);
  }

  private async toPosDto(
    tx: Transaction,
    bo: TransactionBackorderMetadata,
    pointOfSaleId: string | null,
  ): Promise<PosBackorderForFulfillDto> {
    const customer = tx.customer as
      | {
          id?: string;
          person?: {
            firstName?: string;
            lastName?: string;
            documentNumber?: string;
          };
        }
      | undefined;

    const person = customer?.person;
    const customerName = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || null
      : null;
    const customerDocument =
      typeof person?.documentNumber === 'string' &&
      person.documentNumber.trim()
        ? person.documentNumber.trim()
        : null;

    // Resolve POS storageId for stock lookup
    let posStorageId: string | null = null;
    if (pointOfSaleId?.trim()) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: pointOfSaleId.trim(), deletedAt: IsNull() },
        select: ['id', 'storageId'],
      });
      posStorageId = pos?.storageId ?? null;
    }

    // Fetch variant info and stock for all lines in one batch
    const variantIds = (tx.lines ?? [])
      .map((l) => l.productVariantId)
      .filter((id): id is string => !!id);

    const variantMap = new Map<string, ProductVariant>();
    const stockMap = new Map<string, number>();
    let unitsById: Map<string, Unit> | undefined;

    if (variantIds.length > 0) {
      const variants = await this.dataSource.getRepository(ProductVariant).find({
        where: variantIds.map((id) => ({ id, deletedAt: IsNull() })),
        relations: ['saleUnit', 'stockBaseUnit'],
      });
      for (const v of variants) {
        variantMap.set(v.id, v);
      }

      const companyId = tx.companyId;
      if (companyId) {
        const unitRows = await this.dataSource.getRepository(Unit).find({
          where: { companyId, deletedAt: IsNull() },
        });
        unitsById = new Map(unitRows.map((u) => [u.id, u]));
      }

      if (posStorageId) {
        const stockLevels = await this.dataSource
          .getRepository(StockLevel)
          .createQueryBuilder('sl')
          .where('sl.productVariantId IN (:...variantIds)', { variantIds })
          .andWhere('sl.storageId = :storageId', { storageId: posStorageId })
          .select('sl.productVariantId', 'variantId')
          .addSelect('sl.availableStock', 'availableStock')
          .getRawMany<{ variantId: string; availableStock: string }>();
        for (const row of stockLevels) {
          stockMap.set(row.variantId, Number(row.availableStock ?? 0));
        }
      }
    }

    const sortedLines = [...(tx.lines ?? [])].sort(
      (a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0),
    );
    const lines = sortedLines.map((line, index) => {
      // En POS el carrito siempre opera en **unidad de venta**.
      // `quantityInBase` puede ser ml/g/cm (unidad base de stock) y no debe usarse para UI.
      const qty = Number(line.quantity) > 0 ? Number(line.quantity) : Number(line.quantityInBase) || 0;
      const taxRate =
        Number(line.taxRate) ||
        Number((line as { tax?: { rate?: number } }).tax?.rate) ||
        0;

      const variant = line.productVariantId ? variantMap.get(line.productVariantId) : undefined;
      const track = variant?.trackInventory ?? true;
      const saleUnitSymbol = (variant as any)?.saleUnit?.symbol ?? null;
      const stockBaseUnitSymbol = (variant as any)?.stockBaseUnit?.symbol ?? null;
      const stockBaseQtyPerCountSaleUnit: number | null = (() => {
        const raw = (variant as any)?.stockBaseQtyPerCountSaleUnit;
        if (raw == null || raw === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
      })();
      const unitAllowDecimals = (variant as any)?.saleUnit?.allowDecimals === true;

      let availableStock: number | null = null;
      let availableStockBase: number | null = null;
      if (track && variant && posStorageId) {
        const stockBaseQty = stockMap.get(variant.id) ?? 0;
        availableStockBase = stockBaseQty;
        availableStock = posDisplayStockInSaleUnits({
          physicalStockInBase: stockBaseQty,
          stockBaseUnitId: variant.stockBaseUnitId,
          saleUnitId: variant.saleUnitId,
          stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
          saleDimension: (variant as any).saleUnit?.dimension ?? null,
          stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
          unitsById,
        });
      }

      return {
        id: line.id,
        lineNumber: line.lineNumber ?? index + 1,
        productId: line.productId ?? null,
        productVariantId: line.productVariantId ?? null,
        productName: line.productName,
        productSku: line.productSku ?? null,
        variantName: line.variantName ?? null,
        quantity: qty,
        unitPrice: Number(line.unitPrice) || 0,
        discountAmount: Number(line.discountAmount) || 0,
        taxRate,
        taxAmount: Number(line.taxAmount) || 0,
        subtotal: Number(line.subtotal) || 0,
        total: Number(line.total) || 0,
        unitOfMeasure: line.unitOfMeasure ?? null,
        saleUnitSymbol,
        stockBaseUnitSymbol,
        stockBaseQtyPerCountSaleUnit,
        unitAllowDecimals,
        availableStock,
        availableStockBase,
      };
    });

    const deposit = Math.round(Number(bo.depositAmount ?? tx.total) || 0);
    const consumed = Math.round(Number(bo.depositConsumedAmount ?? 0) || 0);
    const depositAvailable = Math.max(0, deposit - consumed);

    return {
      id: tx.id,
      documentNumber: tx.documentNumber,
      transactionType: tx.transactionType,
      status: tx.status,
      createdAt:
        tx.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : String(tx.createdAt ?? ''),
      subtotal: Number(tx.subtotal) || 0,
      taxAmount: Number(tx.taxAmount) || 0,
      discountAmount: Number(tx.discountAmount) || 0,
      total: Number(tx.total) || 0,
      customerId: customer?.id ?? tx.customerId ?? null,
      customerName,
      customerDocument,
      branchName: tx.branch?.name ?? null,
      pointOfSaleName: tx.pointOfSale?.name ?? null,
      reservationStatus: String(bo.reservationStatus ?? 'OPEN').toUpperCase(),
      depositAmount: deposit,
      depositConsumedAmount: consumed,
      depositAvailable,
      lines,
    };
  }
}
