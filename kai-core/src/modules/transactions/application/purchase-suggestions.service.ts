import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';
import { PurchaseOrderReceptionProgressService } from './purchase-order-reception-progress.service';

export type SuggestionReason = 'BELOW_MINIMUM' | 'REORDER';

export interface PurchaseSuggestionItem {
  productId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  attributeValues: Record<string, string> | null;
  reason: SuggestionReason;
  /** Existencia física total (todas las bodegas). */
  currentStock: number;
  /** Pendiente de recibir en órdenes de compra abiertas. */
  onOrder: number;
  minimumStock: number | null;
  reorderPoint: number | null;
  targetStock: number;
  /** Cantidad sugerida, en la unidad de stock de la variante. */
  suggestedQuantity: number;
  lastUnitCost: number | null;
  /** Costo estimado (último costo de compra → PMP → costo base). */
  estimatedUnitCost: number;
  defaultTaxIds: string[];
}

export interface PurchaseSuggestionGroup {
  supplierId: string | null;
  supplierName: string;
  items: PurchaseSuggestionItem[];
  estimatedNetTotal: number;
}

const OPEN_PO_STATUSES = [TransactionStatus.CONFIRMED, TransactionStatus.PARTIALLY_RECEIVED];
const PURCHASABLE_TYPES = [ProductType.PHYSICAL, ProductType.INSUMO];
const CLOSED = [TransactionStatus.VOIDED, TransactionStatus.CANCELLED];
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * "Qué comprar": variantes bajo el mínimo o el punto de reposición, agrupadas por el último proveedor
 * al que se les compró. Usa los umbrales a nivel de variante (los marcados como habilitados) y descuenta
 * lo que ya está pendiente de recibir en órdenes abiertas.
 */
@Injectable()
export class PurchaseSuggestionsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly poProgress: PurchaseOrderReceptionProgressService,
  ) {}

  async getSuggestions(companyId: string): Promise<PurchaseSuggestionGroup[]> {
    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.product', 'p')
      .where('v.companyId = :companyId', { companyId })
      .andWhere('v.isActive = true')
      .andWhere('p.isActive = true')
      .andWhere('p.productType IN (:...types)', { types: PURCHASABLE_TYPES })
      .andWhere('(v.minimumStockEnabled = true OR v.reorderPointEnabled = true)')
      .getMany();
    if (variants.length === 0) return [];
    const ids = variants.map((v) => v.id);

    const [stockByVariant, onOrderByVariant, lastPurchaseByVariant] = await Promise.all([
      this.loadStock(companyId, ids),
      this.loadOnOrder(companyId),
      this.loadLastPurchases(companyId, ids),
    ]);

    const itemsBySupplier = new Map<string | null, PurchaseSuggestionItem[]>();
    for (const v of variants) {
      const item = this.buildItem(
        v,
        stockByVariant.get(v.id) ?? 0,
        onOrderByVariant.get(v.id) ?? 0,
        lastPurchaseByVariant.get(v.id) ?? null,
      );
      if (!item) continue;
      const supplierId = lastPurchaseByVariant.get(v.id)?.supplierId ?? null;
      const list = itemsBySupplier.get(supplierId) ?? [];
      list.push(item);
      itemsBySupplier.set(supplierId, list);
    }

    const supplierIds = [...itemsBySupplier.keys()].filter((s): s is string => !!s);
    const suppliers = supplierIds.length
      ? await this.supplierRepo.find({
          where: { id: In(supplierIds), companyId },
          relations: ['person'],
        })
      : [];
    const nameById = new Map(suppliers.map((s) => [s.id, this.supplierLabel(s)]));

    const groups: PurchaseSuggestionGroup[] = [];
    for (const [supplierId, items] of itemsBySupplier) {
      items.sort(
        (a, b) =>
          Number(b.reason === 'BELOW_MINIMUM') - Number(a.reason === 'BELOW_MINIMUM') ||
          a.productName.localeCompare(b.productName, 'es'),
      );
      groups.push({
        supplierId,
        supplierName: supplierId ? (nameById.get(supplierId) ?? 'Proveedor') : 'Sin proveedor',
        items,
        estimatedNetTotal: Math.round(
          items.reduce((s, i) => s + i.suggestedQuantity * i.estimatedUnitCost, 0),
        ),
      });
    }
    // Proveedores con nombre primero; "Sin proveedor" al final.
    groups.sort(
      (a, b) =>
        Number(a.supplierId === null) - Number(b.supplierId === null) ||
        a.supplierName.localeCompare(b.supplierName, 'es'),
    );
    return groups;
  }

  private buildItem(
    v: ProductVariant,
    currentStock: number,
    onOrder: number,
    last: { supplierId: string | null; unitCost: number } | null,
  ): PurchaseSuggestionItem | null {
    const min = v.minimumStockEnabled ? Number(v.minimumStock) || 0 : 0;
    const reorder = v.reorderPointEnabled ? Number(v.reorderPoint) || 0 : 0;
    const max = v.maximumStockEnabled ? Number(v.maximumStock) || 0 : 0;

    const belowMin = v.minimumStockEnabled && currentStock < min;
    const atReorder = v.reorderPointEnabled && currentStock <= reorder;
    if (!belowMin && !atReorder) return null;

    // Meta: máximo si está definido; si no, el doble del umbral más alto.
    const target = max > 0 ? max : Math.max(min, reorder) * 2;
    const missing = target - currentStock - onOrder;
    const suggestedQuantity = Math.ceil(missing - 1e-9);
    if (suggestedQuantity <= 0) return null;

    const cost = last?.unitCost || Number(v.pmp) || Number(v.baseCost) || 0;
    return {
      productId: v.productId ?? v.product?.id ?? '',
      productVariantId: v.id,
      productName: v.product?.name ?? v.sku,
      sku: v.sku,
      attributeValues: v.attributeValues ?? null,
      reason: belowMin ? 'BELOW_MINIMUM' : 'REORDER',
      currentStock: round2(currentStock),
      onOrder: round2(onOrder),
      minimumStock: v.minimumStockEnabled ? min : null,
      reorderPoint: v.reorderPointEnabled ? reorder : null,
      targetStock: target,
      suggestedQuantity,
      lastUnitCost: last?.unitCost ?? null,
      estimatedUnitCost: Math.round(cost),
      defaultTaxIds: v.taxIds ?? [],
    };
  }

  private async loadStock(companyId: string, ids: string[]): Promise<Map<string, number>> {
    const rows = await this.stockRepo
      .createQueryBuilder('sl')
      .select('sl.productVariantId', 'variantId')
      .addSelect('COALESCE(SUM(sl.physicalStock), 0)', 'total')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.productVariantId IN (:...ids)', { ids })
      .groupBy('sl.productVariantId')
      .getRawMany<{ variantId: string; total: string }>();
    return new Map(rows.map((r) => [r.variantId, Number(r.total) || 0]));
  }

  /** Pendiente de recibir por variante en OC abiertas (pedido − recibido). */
  private async loadOnOrder(companyId: string): Promise<Map<string, number>> {
    const openPos = await this.txRepo.find({
      where: {
        companyId,
        transactionType: TransactionType.PURCHASE_ORDER,
        status: In(OPEN_PO_STATUSES),
      },
      select: { id: true },
    });
    const out = new Map<string, number>();
    for (const po of openPos) {
      const progress = await this.poProgress.getProgress(po.id);
      for (const l of progress?.lines ?? []) {
        out.set(l.productVariantId, (out.get(l.productVariantId) ?? 0) + l.pending);
      }
    }
    return out;
  }

  /** Último ingreso (no anulado) por variante: proveedor y costo unitario. */
  private async loadLastPurchases(
    companyId: string,
    ids: string[],
  ): Promise<Map<string, { supplierId: string | null; unitCost: number }>> {
    const rows = await this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.transaction', 't')
      .select('l.productVariantId', 'variantId')
      .addSelect('t.supplierId', 'supplierId')
      .addSelect('COALESCE(l.unitCost, l.unitPrice)', 'unitCost')
      .distinctOn(['l.productVariantId'])
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status NOT IN (:...closed)', { closed: CLOSED })
      .andWhere('l.productVariantId IN (:...ids)', { ids })
      .orderBy('l.productVariantId')
      .addOrderBy('t.createdAt', 'DESC')
      .getRawMany<{ variantId: string; supplierId: string | null; unitCost: string }>();
    return new Map(
      rows.map((r) => [r.variantId, { supplierId: r.supplierId, unitCost: Number(r.unitCost) || 0 }]),
    );
  }

  private supplierLabel(s: Supplier): string {
    const alias = s.alias?.trim();
    if (alias) return alias;
    const p = s.person as
      | { businessName?: string | null; firstName?: string | null; lastName?: string | null }
      | undefined;
    const business = p?.businessName?.trim();
    if (business) return business;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
    return full || 'Proveedor';
  }
}
