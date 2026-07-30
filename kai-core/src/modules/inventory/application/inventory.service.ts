import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { StoragesService } from '../../storages/application/storages.service';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { Unit } from '@modules/units/domain/unit.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { UpdateStockLevelThresholdsDto } from './dto/update-stock-level-thresholds.dto';
import type { StockUpdatedPayload } from '@modules/stock-realtime/stock-realtime.types';
import { buildStockUpdatedPayload } from '@modules/stock-realtime/stock-threshold-alert-payload.util';
import {
  resolveEffectiveThresholdsForStorage,
  variantThresholdDefaultsFromRow,
} from '@modules/stock-realtime/stock-threshold-field.util';
import { NotificationInboxService } from '@modules/notifications/application/notification-inbox.service';
import { StockAlertNotificationService } from '@modules/notifications/application/stock-alert-notification.service';
import {
  STOCK_LEVELS_REPOSITORY,
  type StockLevelsRepositoryPort,
} from './ports/stock-levels.repository.port';
import {
  computeVariantStockAlertKinds,
  parseStockAlertsQueryParam,
  stockLevelToThresholdSlice,
} from '@modules/stock-realtime/variant-stock-alert.util';
import { applyInventoryStockTextSearch } from './inventory-stock-search.util';

function compactUnitSymbol(u: { symbol?: string | null; name?: string | null } | null | undefined): string {
  if (!u) {
    return '';
  }
  const sym = String(u.symbol || '').trim();
  if (sym) {
    return sym;
  }
  const name = String(u.name || '').trim();
  return name.length <= 10 ? name : `${name.slice(0, 8)}…`;
}

function parsePositiveBridge(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly storagesService: StoragesService,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    private readonly productVariantsService: ProductVariantsService,
    private readonly variantQtyConversion: VariantQuantityConversionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationInbox: NotificationInboxService,
    private readonly stockAlertNotifications: StockAlertNotificationService,
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockLevelsRepository: StockLevelsRepositoryPort,
  ) {}

  async getStockMovementsPaginated(params: {
    companyId: string;
    variantId: string;
    storageId?: string;
    page?: number;
    limit?: number;
  }) {
    const variantId = params.variantId?.trim();
    if (!variantId) {
      throw new BadRequestException('variantId es requerido');
    }
    const storageId = params.storageId?.trim() || undefined;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 25));
    const result = await this.stockLevelsRepository.getMovementHistoryPaginated(
      variantId,
      storageId,
      page,
      limit,
      params.companyId?.trim() || undefined,
    );
    return {
      data: result.rows,
      rows: result.rows,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Return filter options used by the frontend inventory pages.
   * Provide real storages from the StoragesService; other filters remain empty for now.
   */
  async getFilters() {
    const storages = await this.storagesService.getAllStorages(false);

    return {
      storages,
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
  }

  /**
   * Exact lookup of a product variant by SKU or barcode (stock PWA scanner).
   * @deprecated Prefer GET /product-variants/lookup — kept for backward compatibility.
   */
  async lookupVariantByCode(value: string, by: 'barcode' | 'sku') {
    return this.productVariantsService.lookupByCode(value, by);
  }

  /**
   * Basic inventory search placeholder. Returns empty rows and total=0.
   * Frontend expects either an array or an object with rows/data and total.
   */
  async search(params?: {
    search?: string;
    branchId?: string;
    storageId?: string;
    /** Query `stock-alerts`: solo variantes con alerta de umbrales activa. */
    stockAlerts?: string | boolean;
    page?: number;
    limit?: number;
    sortField?: string;
    sort?: 'asc' | 'desc';
  }) {
    // List from product variants (LEFT stock_levels in a second query) so variants
    // without any stock_level row still appear with zeros.
    const variantQb = this.dataSource
      .getRepository(ProductVariant)
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('variant.stockBaseUnit', 'stockBaseUnit')
      .leftJoinAndSelect('variant.saleUnit', 'saleUnit')
      .where('variant.deletedAt IS NULL')
      .andWhere('(product.deletedAt IS NULL OR product.id IS NULL)');

    applyInventoryStockTextSearch(variantQb, params?.search);

    const variants = await variantQb.getMany();
    const variantIds = variants.map((v) => v.id);

    const companyIds = [...new Set(variants.map((v) => v.companyId).filter(Boolean))];
    let unitsById = new Map<string, Unit>();
    if (companyIds.length > 0) {
      const unitRows = await this.dataSource.getRepository(Unit).find({
        where: { companyId: In(companyIds), deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    const stockBaseQtyPerSaleUnitFor = (variant: ProductVariant): number | null => {
      const stockId = variant.stockBaseUnitId ?? variant.unitId;
      const saleId = variant.saleUnitId ?? variant.unitId;
      if (!stockId || !saleId || stockId === saleId) {
        return null;
      }
      try {
        const r = this.variantQtyConversion.toVariantStockBaseSync(
          variant,
          1,
          saleId,
          unitsById,
          'sale',
        );
        const q = Number(r.quantityInBase);
        return Number.isFinite(q) && q > 0 ? q : null;
      } catch {
        return parsePositiveBridge((variant as any).stockBaseQtyPerCountSaleUnit);
      }
    };

    const stockLevels: StockLevel[] = [];
    const CHUNK = 500;
    for (let i = 0; i < variantIds.length; i += CHUNK) {
      const chunk = variantIds.slice(i, i + CHUNK);
      const batch = await this.dataSource.getRepository(StockLevel).find({
        where: { productVariantId: In(chunk) },
        relations: ['storage', 'storage.branch'],
      });
      stockLevels.push(...batch);
    }

    const levelsByVariant = new Map<string, StockLevel[]>();
    for (const sl of stockLevels) {
      const list = levelsByVariant.get(sl.productVariantId) ?? [];
      list.push(sl);
      levelsByVariant.set(sl.productVariantId, list);
    }

    const filterLevel = (sl: StockLevel): boolean => {
      if (params?.storageId && sl.storageId !== params.storageId) {
        return false;
      }
      if (params?.branchId && sl.storage?.branchId !== params.branchId) {
        return false;
      }
      return true;
    };

    let placeholderStorage: Storage | null = null;
    if (params?.storageId) {
      placeholderStorage = await this.dataSource
        .getRepository(Storage)
        .findOne({
          where: { id: params.storageId },
          relations: ['branch'],
        });
    }

    const grouped: Record<string, any> = {};
    for (const variant of variants) {
      const vid = variant.id;
      const product: any = variant.product;
      const allLevels = levelsByVariant.get(vid) ?? [];
      const entries = allLevels.filter(filterLevel);

      const row = {
        id: variant.id,
        productId: product?.id || null,
        variantId: variant.id,
        productName: product?.name || '',
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        unitOfMeasure: (() => {
          const u = variant.stockBaseUnit ?? variant.unit;
          if (!u) {
            return '';
          }
          const sym = String(u.symbol || '').trim();
          const name = String(u.name || '').trim();
          if (sym && name && sym.toLowerCase() !== name.toLowerCase()) {
            return `${name} (${sym})`;
          }
          return sym || name;
        })(),
        saleUnitOfMeasure: (() => {
          const u = variant.saleUnit ?? variant.unit;
          if (!u) {
            return '';
          }
          const sym = String(u.symbol || '').trim();
          const name = String(u.name || '').trim();
          if (sym && name && sym.toLowerCase() !== name.toLowerCase()) {
            return `${name} (${sym})`;
          }
          return sym || name;
        })(),
        stockUnitSymbol: compactUnitSymbol(
          (variant as any).stockBaseUnit ?? (variant as any).unit,
        ),
        saleUnitSymbol: compactUnitSymbol(
          (variant as any).saleUnit ?? (variant as any).unit,
        ),
        stockBaseQtyPerCountSaleUnit: parsePositiveBridge(
          (variant as any).stockBaseQtyPerCountSaleUnit,
        ),
        stockBaseUnitId: variant.stockBaseUnitId ?? variant.unitId,
        saleUnitId: variant.saleUnitId ?? variant.unitId,
        stockBaseQtyPerSaleUnit: stockBaseQtyPerSaleUnitFor(variant),
        attributeValues: variant.attributeValues || {},
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
        availableAfterReservation: 0,
        inventoryValueCost: 0,
        pmp:
          variant.pmp != null && Number.isFinite(Number(variant.pmp))
            ? Number(variant.pmp)
            : null,
        storageBreakdown: [] as any[],
        movements: [] as any[],
        primaryStorageName: '',
        primaryStorageQuantity: 0,
        isBelowMinimum: false,
        hasStockAlert: false,
        stockAlertKinds: [] as string[],
      };
      grouped[vid] = row;

      if (
        params?.storageId &&
        entries.length === 0 &&
        placeholderStorage
      ) {
        const placeholderThresholds = resolveEffectiveThresholdsForStorage(
          variantThresholdDefaultsFromRow(variant),
          {},
        );
        row.storageBreakdown.push({
          stockLevelId: null,
          storageId: placeholderStorage.id,
          storageName: placeholderStorage.name || '',
          branchName: placeholderStorage.branch?.name || null,
          quantity: 0,
          availableStock: 0,
          reservedStock: 0,
          availableAfterReservation: 0,
          committedStock: 0,
          ...placeholderThresholds,
        });
      }

      const variantThresholds = variantThresholdDefaultsFromRow(variant);
      for (const sl of entries) {
        const qty = Number(sl.physicalStock || 0);
        const reservedQty = Number(sl.committedStock || 0);
        const availableQty = qty - reservedQty;
        row.reservedStock += reservedQty;
        const resolved = resolveEffectiveThresholdsForStorage(variantThresholds, {
          minimumStock: sl.minimumStock ?? null,
          minimumStockEnabled: sl.minimumStockEnabled ?? null,
          maximumStock: sl.maximumStock ?? null,
          maximumStockEnabled: sl.maximumStockEnabled ?? null,
          reorderPoint: sl.reorderPoint ?? null,
          reorderPointEnabled: sl.reorderPointEnabled ?? null,
        });
        row.storageBreakdown.push({
          stockLevelId: sl.id,
          storageId: sl.storageId,
          storageName: sl.storage?.name || '',
          branchName: sl.storage?.branch?.name || null,
          quantity: qty,
          availableStock: availableQty,
          reservedStock: reservedQty,
          availableAfterReservation: availableQty,
          committedStock: reservedQty,
          ...resolved,
        });
        row.totalStock += qty;
        row.availableStock += availableQty;
        row.inventoryValueCost += qty * Number(variant.baseCost || 0);
        if (!row.primaryStorageName) {
          row.primaryStorageName = sl.storage?.name || '';
          row.primaryStorageQuantity = qty;
        }
      }

      row.availableAfterReservation = Number(row.availableStock || 0);
      const allSlices = allLevels.map(stockLevelToThresholdSlice);
      const stockAlertKinds = computeVariantStockAlertKinds(variant, allSlices, {
        filterStorageId: params?.storageId,
      });
      row.stockAlertKinds = stockAlertKinds;
      row.hasStockAlert = stockAlertKinds.length > 0;
      row.isBelowMinimum = row.hasStockAlert;
    }

    let rows = variants.map((v) => grouped[v.id]).filter(Boolean);
    if (parseStockAlertsQueryParam(params?.stockAlerts)) {
      rows = rows.filter((r) => Boolean(r.hasStockAlert));
    }
    for (const r of rows) {
      r.pmpValue =
        r.pmp != null && Number.isFinite(Number(r.pmp))
          ? Number(((r.totalStock || 0) * Number(r.pmp)).toFixed(2))
          : null;
    }

    const sumPmpValue = rows.reduce(
      (acc, r) => acc + (r.pmpValue != null ? Number(r.pmpValue) : 0),
      0,
    );

    const sortField = (params?.sortField || 'productName').trim();
    const sortDesc = params?.sort === 'desc';
    const compare = (a: Record<string, any>, b: Record<string, any>): number => {
      let va: string | number | boolean | null | undefined;
      let vb: string | number | boolean | null | undefined;
      switch (sortField) {
        case 'sku':
          va = a.sku;
          vb = b.sku;
          break;
        case 'unitOfMeasure':
          va = a.unitOfMeasure;
          vb = b.unitOfMeasure;
          break;
        case 'saleUnitOfMeasure':
          va = a.saleUnitOfMeasure;
          vb = b.saleUnitOfMeasure;
          break;
        case 'totalStock':
          va = Number(a.totalStock);
          vb = Number(b.totalStock);
          break;
        case 'availableStock':
          va = Number(a.availableStock);
          vb = Number(b.availableStock);
          break;
        case 'pmp':
          va = a.pmp != null ? Number(a.pmp) : -1;
          vb = b.pmp != null ? Number(b.pmp) : -1;
          break;
        case 'pmpValue':
          va = a.pmpValue != null ? Number(a.pmpValue) : -1;
          vb = b.pmpValue != null ? Number(b.pmpValue) : -1;
          break;
        case 'inventoryValueCost':
          va = Number(a.inventoryValueCost);
          vb = Number(b.inventoryValueCost);
          break;
        case 'isBelowMinimum':
          va = a.isBelowMinimum ? 1 : 0;
          vb = b.isBelowMinimum ? 1 : 0;
          break;
        default:
          va = a.productName;
          vb = b.productName;
      }
      if (va == null && vb == null) {
        return 0;
      }
      if (va == null) {
        return 1;
      }
      if (vb == null) {
        return -1;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return va - vb;
      }
      return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    };
    rows.sort((a, b) => {
      const c = compare(a, b);
      return sortDesc ? -c : c;
    });

    const total = rows.length;
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params?.limit) || 25));
    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);

    // fetch recent movements per variant (limit 5 each) — solo página actual
    const transactionLineRepo =
      this.dataSource.getRepository('TransactionLine');
    for (const row of pageRows) {
      if (!row.variantId) continue;
      const movs: any[] = await transactionLineRepo
        .createQueryBuilder('tl')
        .innerJoin('tl.transaction', 't')
        .leftJoin('t.storageEntry', 's')
        .leftJoin('t.targetStorageEntry', 'ts')
        .where('tl.productVariantId = :vid', { vid: row.variantId })
        .orderBy('t.createdAt', 'DESC')
        .limit(5)
        .select([
          't.id as transactionId',
          't.documentNumber as documentNumber',
          't.transactionType as transactionType',
          't.createdAt as createdAt',
          'tl.quantity as quantity',
          't.notes as notes',
          's.name as storageName',
          'ts.name as targetStorageName',
        ])
        .getRawMany();
      row.movements = movs.map((m) => ({
        ...m,
        direction: [
          'PURCHASE',
          'TRANSFER_IN',
          'ADJUSTMENT_IN',
          'CASH_SESSION_OPENING',
        ].includes(m.transactionType)
          ? 'IN'
          : 'OUT',
      }));
    }

    return {
      rows: pageRows,
      total,
      sumPmpValue: Number(sumPmpValue.toFixed(2)),
    };
  }

  async adjust(data: {
    variantId: string;
    storageId: string;
    currentQuantity: number;
    targetQuantity: number;
    note?: string;
  }) {
    const { variantId, storageId, targetQuantity, note } = data;
    const targetQty = Math.max(0, Number(targetQuantity) || 0);

    const stockLevel = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId },
    });
    const actualCurrent = Math.max(0, Number(stockLevel?.physicalStock ?? 0) || 0);

    // The listener already keeps stock levels up‑to‑date whenever a
    // transaction is created. In previous versions we were manually
    // writing the target quantity here, which caused the listener to apply
    // the adjustment a second time and leave the stock in an incorrect
    // state.  Instead we simply create the appropriate adjustment
    // transaction and let the listener perform the actual update.
    // Diff is always from DB physical stock (client currentQuantity is ignored).
    const diff = targetQty - actualCurrent;
    const qtyAbs = Math.abs(diff);
    if (qtyAbs < 0.000001) {
      return {
        success: true,
        message: 'Sin cambios de stock',
        documentNumbers: [],
      };
    }

    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: variantId },
      relations: ['product', 'unit'],
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    const product: any = variant.product;

    // Branch from almacén (sirve aunque no exista fila stock_levels para esta variante).
    const storageEntity = await this.dataSource.getRepository(Storage).findOne({
      where: { id: storageId },
      select: ['id', 'branchId'],
    });
    if (!storageEntity) {
      throw new NotFoundException(`Almacén ${storageId} no encontrado`);
    }
    let branchId: string | undefined =
      storageEntity.branchId && String(storageEntity.branchId).length > 0
        ? storageEntity.branchId
        : undefined;

    if (!branchId) {
      const fallbackBranches = await this.dataSource.getRepository(Branch).find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: 1,
      });
      branchId = fallbackBranches[0]?.id;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal del ajuste: el almacén no tiene sucursal y no hay sucursales en el sistema.',
      );
    }

    // pick a default user for internal adjustments (first active user)
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id;
    if (!userId) {
      throw new BadRequestException(
        'No hay usuario activo para registrar el ajuste. Cree o active al menos un usuario en el sistema.',
      );
    }

    const txDto = new CreateTransactionDto();
    txDto.transactionType =
      diff >= 0
        ? TransactionType.ADJUSTMENT_IN
        : TransactionType.ADJUSTMENT_OUT;
    txDto.branchId = branchId || '';
    txDto.userId = userId;
    txDto.storageId = storageId;
    txDto.subtotal = qtyAbs;
    txDto.taxAmount = 0;
    txDto.discountAmount = 0;
    txDto.total = qtyAbs;
    // internal inventory movements are not actual payments
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = qtyAbs;
    txDto.notes = note || undefined;
    txDto.metadata = {
      ...(txDto.metadata || {}),
      inventoryAdjustMode: 'set_absolute',
      targetPhysicalStock: targetQty,
      previousPhysicalStock: actualCurrent,
    };
    const stockBaseUnitId =
      (variant as any).stockBaseUnitId ?? variant.unitId;
    txDto.lines = [
      {
        productId: variant.productId || product?.id,
        productVariantId: variantId,
        unitId: stockBaseUnitId,
        productName: product?.name || 'Producto',
        productSku: variant.sku,
        variantName: undefined,
        quantity: qtyAbs,
        unitPrice: 0,
        unitCost: 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: qtyAbs,
        total: qtyAbs,
        notes: note,
      } as any,
    ];
    const tx = await this.transactionsService.createTransaction(txDto);

    const companyIdForNotify =
      variant.companyId ||
      (
        await this.dataSource.getRepository(Branch).findOne({
          where: { id: branchId },
          select: { companyId: true },
        })
      )?.companyId;
    if (companyIdForNotify) {
      const committed = Math.max(
        0,
        Number(stockLevel?.committedStock ?? 0) || 0,
      );
      await this.stockAlertNotifications.publishForVariantStorage({
        companyId: companyIdForNotify,
        productVariantId: variantId,
        storageId,
        transactionId: tx.id,
        physicalStockOverride: targetQty,
        availableStockOverride: Math.max(0, targetQty - committed),
      });
    }

    return {
      success: true,
      message: `Stock físico establecido en ${targetQty} (antes ${actualCurrent})`,
      documentNumbers: [tx.documentNumber],
    };
  }

  async transfer(data: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }) {
    const { variantId, sourceStorageId, targetStorageId, quantity, note } =
      data;

    // Stock: solo vía transacciones + UpdateStock (evita doble movimiento).
    const srcLevel = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId: sourceStorageId },
    });
    const srcQty = Number(srcLevel?.physicalStock ?? 0);
    const tgtLevelBefore = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId: targetStorageId },
    });
    const tgtQtyBefore = Number(tgtLevelBefore?.physicalStock ?? 0);
    if (srcQty + 1e-9 < quantity) {
      throw new BadRequestException(
        `Stock insuficiente en origen: hay ${srcQty}, se solicitan ${quantity}.`,
      );
    }

    let branchId: string | undefined;
    const rawSource = await this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .leftJoin('sl.storage', 's')
      .where('sl.storageId = :sid', { sid: sourceStorageId })
      .select('s.branchId', 'branchId')
      .getRawOne();
    branchId = rawSource?.branchId || undefined;
    if (branchId === '') {
      branchId = undefined;
    }
    // if still undefined try target storage
    if (!branchId) {
      const rawTarget = await this.dataSource
        .getRepository(StockLevel)
        .createQueryBuilder('sl')
        .leftJoin('sl.storage', 's')
        .where('sl.storageId = :tid', { tid: targetStorageId })
        .select('s.branchId', 'branchId')
        .getRawOne();
      branchId = rawTarget?.branchId || undefined;
      if (branchId === '') branchId = undefined;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal asociada a los almacenes involucrados.',
      );
    }

    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: variantId },
      relations: ['product', 'unit'],
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    const product: any = variant.product;
    const stockBaseUnitId =
      (variant as any).stockBaseUnitId ?? variant.unitId;
    const qty = Math.max(0, Number(quantity) || 0);
    if (qty < 0.000001) {
      throw new BadRequestException('La cantidad a transferir debe ser mayor que cero.');
    }

    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id;
    if (!userId) {
      throw new BadRequestException(
        'No hay usuario activo para registrar la transferencia. Cree o active al menos un usuario en el sistema.',
      );
    }

    const transferLine = {
      productId: variant.productId || product?.id,
      productVariantId: variantId,
      unitId: stockBaseUnitId,
      productName: product?.name || 'Producto',
      productSku: variant.sku,
      variantName: undefined,
      quantity: qty,
      unitPrice: 0,
      unitCost: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: qty,
      total: qty,
      notes: note,
    } as any;

    const txOut = new CreateTransactionDto();
    txOut.transactionType = TransactionType.TRANSFER_OUT;
    txOut.branchId = branchId || '';
    txOut.userId = userId;
    txOut.storageId = sourceStorageId;
    txOut.targetStorageId = targetStorageId;
    txOut.subtotal = qty;
    txOut.taxAmount = 0;
    txOut.discountAmount = 0;
    txOut.total = qty;
    txOut.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txOut.amountPaid = qty;
    txOut.notes = note || undefined;
    txOut.lines = [{ ...transferLine }];
    const out = await this.transactionsService.createTransaction(txOut);

    const txIn = new CreateTransactionDto();
    txIn.transactionType = TransactionType.TRANSFER_IN;
    txIn.branchId = branchId || '';
    txIn.userId = userId;
    txIn.storageId = targetStorageId;
    txIn.targetStorageId = sourceStorageId;
    txIn.subtotal = qty;
    txIn.taxAmount = 0;
    txIn.discountAmount = 0;
    txIn.total = qty;
    txIn.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txIn.amountPaid = qty;
    txIn.notes = note || undefined;
    txIn.lines = [{ ...transferLine }];
    const inn = await this.transactionsService.createTransaction(txIn);

    const companyIdForNotify =
      variant.companyId ||
      (
        await this.dataSource.getRepository(Branch).findOne({
          where: { id: branchId },
          select: { companyId: true },
        })
      )?.companyId;
    if (companyIdForNotify) {
      const srcCommitted = Math.max(
        0,
        Number(srcLevel?.committedStock ?? 0) || 0,
      );
      const tgtCommitted = Math.max(
        0,
        Number(tgtLevelBefore?.committedStock ?? 0) || 0,
      );
      const srcPhysicalAfter = Math.max(0, srcQty - qty);
      const tgtPhysicalAfter = Math.max(0, tgtQtyBefore + qty);
      await this.stockAlertNotifications.publishForVariantStorage({
        companyId: companyIdForNotify,
        productVariantId: variantId,
        storageId: sourceStorageId,
        transactionId: out.id,
        physicalStockOverride: srcPhysicalAfter,
        availableStockOverride: Math.max(0, srcPhysicalAfter - srcCommitted),
      });
      await this.stockAlertNotifications.publishForVariantStorage({
        companyId: companyIdForNotify,
        productVariantId: variantId,
        storageId: targetStorageId,
        transactionId: inn.id,
        physicalStockOverride: tgtPhysicalAfter,
        availableStockOverride: Math.max(0, tgtPhysicalAfter - tgtCommitted),
      });
    }

    return {
      success: true,
      message: 'Transferencia registrada',
      documentNumbers: [out.documentNumber, inn.documentNumber],
    };
  }

  async updateStockLevelThresholds(
    companyId: string,
    body: UpdateStockLevelThresholdsDto,
  ) {
    const storage = await this.dataSource.getRepository(Storage).findOne({
      where: { id: body.storageId },
      select: ['id', 'companyId'],
    });
    if (!storage || storage.companyId !== companyId) {
      throw new ForbiddenException('Almacén no válido para la empresa activa');
    }
    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: body.productVariantId },
      select: ['id', 'companyId'],
    });
    if (!variant || variant.companyId !== companyId) {
      throw new ForbiddenException('Variante no válida para la empresa activa');
    }
    let level = await this.dataSource.getRepository(StockLevel).findOne({
      where: {
        productVariantId: body.productVariantId,
        storageId: body.storageId,
      },
    });
    if (!level) {
      level = this.dataSource.getRepository(StockLevel).create({
        companyId,
        productVariantId: body.productVariantId,
        storageId: body.storageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
      });
    }
    if (body.minimumStock !== undefined) {
      level.minimumStock = body.minimumStock;
    }
    if (body.minimumStockEnabled !== undefined) {
      level.minimumStockEnabled = body.minimumStockEnabled;
    }
    if (body.maximumStock !== undefined) {
      level.maximumStock = body.maximumStock;
    }
    if (body.maximumStockEnabled !== undefined) {
      level.maximumStockEnabled = body.maximumStockEnabled;
    }
    if (body.reorderPoint !== undefined) {
      level.reorderPoint = body.reorderPoint;
    }
    if (body.reorderPointEnabled !== undefined) {
      level.reorderPointEnabled = body.reorderPointEnabled;
    }
    await this.dataSource.getRepository(StockLevel).save(level);
    return { ok: true, id: level.id };
  }

  /**
   * Salidas alineadas con el payload WebSocket `stock:updated` para hidratar alertas al cargar la app.
   */
  async getThresholdAlerts(
    companyId: string,
    storageId?: string | null,
    userId?: string,
  ): Promise<StockUpdatedPayload[]> {
    if (userId) {
      return this.notificationInbox.listStockThresholdAlertsLegacy(
        userId,
        companyId,
        storageId ?? undefined,
      ) as Promise<StockUpdatedPayload[]>;
    }

    const qb = this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .innerJoinAndSelect('sl.variant', 'variant')
      .where('sl.companyId = :cid', { cid: companyId });
    if (storageId) {
      qb.andWhere('sl.storageId = :sid', { sid: storageId });
    }
    const levels = await qb.getMany();
    const out: StockUpdatedPayload[] = [];
    for (const sl of levels) {
      if (!sl.variant) {
        continue;
      }
      const payload = buildStockUpdatedPayload(
        companyId,
        sl.variant,
        sl,
        sl.lastTransactionId ?? null,
      );
      if (payload.alerts.length > 0) {
        out.push(payload);
      }
    }
    return out;
  }
}
