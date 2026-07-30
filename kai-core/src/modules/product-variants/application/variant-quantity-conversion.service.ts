import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { ProductVariant } from '../domain/product-variant.entity';
import type { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { isMassVolumeLength } from './variant-count-bridge.util';

const PURCHASE_ORIENTED_TYPES = new Set<TransactionType>([
  TransactionType.PURCHASE,
  TransactionType.PURCHASE_ORDER,
  TransactionType.PURCHASE_RETURN,
  TransactionType.SUPPLIER_INVOICE,
  TransactionType.SUPPLIER_RECEIPT,
  TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
  TransactionType.SUPPLIER_GUIDE,
  TransactionType.SUPPLIER_CREDIT_NOTE,
]);

/** Ajustes / transferencias / inventario: cantidad en unidad de stock base si no viene `unitId`. */
const STOCK_BASE_DEFAULT_TYPES = new Set<TransactionType>([
  TransactionType.ADJUSTMENT_IN,
  TransactionType.ADJUSTMENT_OUT,
  TransactionType.TRANSFER_IN,
  TransactionType.TRANSFER_OUT,
  TransactionType.INVENTORY_COUNT,
]);

export type VariantQtyLineContext = 'sale' | 'purchase' | 'neutral';

export type VariantQtyToBaseResult = {
  quantityInBase: number;
  unitConversionFactor: number;
  unitOfMeasure: string;
  stockBaseUnitId: string;
};

export type VariantCountBridgeInput = {
  stockBaseQtyPerCountSaleUnit?: number | null;
  stockBaseQtyPerCountPurchaseUnit?: number | null;
};

/**
 * Convierte cantidades de línea a la unidad de stock de la variante y enriquece DTOs de transacción.
 */
@Injectable()
export class VariantQuantityConversionService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  private factorOneUnitToDimensionRoot(unitId: string, byId: Map<string, Unit>): number {
    const u = byId.get(unitId);
    if (!u) {
      throw new BadRequestException(`Unidad ${unitId} no encontrada en la empresa.`);
    }
    if (u.isBase) {
      return 1;
    }
    const cf = Number(u.conversionFactor ?? 1) || 1;
    if (!u.baseUnitId) {
      return cf;
    }
    return cf * this.factorOneUnitToDimensionRoot(u.baseUnitId, byId);
  }

  private dimensionRootId(unitId: string, byId: Map<string, Unit>): string {
    const u = byId.get(unitId);
    if (!u) {
      throw new BadRequestException(`Unidad ${unitId} no encontrada.`);
    }
    if (u.isBase || !u.baseUnitId) {
      return u.id;
    }
    return this.dimensionRootId(u.baseUnitId, byId);
  }

  private parseOptionalPositive(n: unknown): number | null {
    if (n === null || n === undefined || n === '') {
      return null;
    }
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) {
      return null;
    }
    return v;
  }

  private readVariantBridges(variant: ProductVariant): VariantCountBridgeInput {
    return {
      stockBaseQtyPerCountSaleUnit: this.parseOptionalPositive(
        (variant as any).stockBaseQtyPerCountSaleUnit,
      ),
      stockBaseQtyPerCountPurchaseUnit: this.parseOptionalPositive(
        (variant as any).stockBaseQtyPerCountPurchaseUnit,
      ),
    };
  }

  isHomogeneousUomTriplet(
    stockBaseUnitId: string,
    saleUnitId: string,
    purchaseUnitId: string,
    byId: Map<string, Unit>,
  ): boolean {
    const us = byId.get(stockBaseUnitId);
    const vs = byId.get(saleUnitId);
    const ps = byId.get(purchaseUnitId);
    if (!us || !vs || !ps) {
      return false;
    }
    return us.dimension === vs.dimension && vs.dimension === ps.dimension;
  }

  /**
   * Valida stock / venta / compra.
   * - Misma dimensión: cadena convertible (comportamiento previo).
   * - Inventario en masa/volumen/longitud + venta o compra en conteo: requiere factores en variante.
   */
  assertVariantUomTriplet(
    stockBaseUnitId: string,
    saleUnitId: string,
    purchaseUnitId: string,
    byId: Map<string, Unit>,
    bridges?: VariantCountBridgeInput,
  ): void {
    const us = byId.get(stockBaseUnitId);
    const vs = byId.get(saleUnitId);
    const ps = byId.get(purchaseUnitId);
    if (!us || !vs || !ps) {
      throw new BadRequestException('Unidad de stock, venta o compra no encontrada.');
    }
    const ds = us.dimension;
    const dv = vs.dimension;
    const dp = ps.dimension;

    if (ds === dv && dv === dp) {
      const rs = this.dimensionRootId(stockBaseUnitId, byId);
      const rv = this.dimensionRootId(saleUnitId, byId);
      const rp = this.dimensionRootId(purchaseUnitId, byId);
      if (rs !== rv || rs !== rp) {
        throw new BadRequestException(
          'Las unidades de stock, venta y compra deben ser convertibles entre sí (misma cadena hasta la unidad base dimensional).',
        );
      }
      return;
    }

    if (!isMassVolumeLength(ds)) {
      throw new BadRequestException(
        'Combinación de unidades no soportada: el inventario debe estar en masa, volumen o longitud cuando la venta o compra usan conteo distinto.',
      );
    }

    const saleBridge = bridges?.stockBaseQtyPerCountSaleUnit ?? null;
    const purchaseBridge = bridges?.stockBaseQtyPerCountPurchaseUnit ?? null;

    if (dv === UnitDimension.COUNT) {
      if (saleBridge == null) {
        throw new BadRequestException(
          'Indique «contenido por unidad de venta (en unidad base de stock)» cuando la unidad de venta es de conteo y el stock no lo es.',
        );
      }
    } else if (dv !== ds) {
      throw new BadRequestException(
        'La unidad de venta debe ser de la misma dimensión que la unidad base de stock, o bien ser de conteo con factor de contenido definido en la variante.',
      );
    }

    if (dp === UnitDimension.COUNT) {
      if (purchaseBridge == null) {
        throw new BadRequestException(
          'Indique «contenido por unidad de compra (en unidad base de stock)» cuando la unidad de compra es de conteo y el stock no lo es.',
        );
      }
    } else if (dp !== ds) {
      throw new BadRequestException(
        'La unidad de compra debe ser de la misma dimensión que la unidad base de stock, o bien ser de conteo con factor de contenido definido en la variante.',
      );
    }
  }

  async validateVariantUomTripletAsync(
    stockBaseUnitId: string,
    saleUnitId: string,
    purchaseUnitId: string,
    companyId: string,
    bridges?: VariantCountBridgeInput,
  ): Promise<void> {
    const rows = await this.unitRepo.find({
      where: { companyId, deletedAt: IsNull() },
    });
    const byId = new Map(rows.map((u) => [u.id, u]));
    this.assertVariantUomTriplet(stockBaseUnitId, saleUnitId, purchaseUnitId, byId, bridges);
  }

  /**
   * Tras validar, fuerza null en puentes si el trío es homogéneo (evita datos huérfanos).
   */
  normalizePersistedCountBridges(
    stockBaseUnitId: string,
    saleUnitId: string,
    purchaseUnitId: string,
    byId: Map<string, Unit>,
    raw: VariantCountBridgeInput,
  ): { stockBaseQtyPerCountSaleUnit: number | null; stockBaseQtyPerCountPurchaseUnit: number | null } {
    if (this.isHomogeneousUomTriplet(stockBaseUnitId, saleUnitId, purchaseUnitId, byId)) {
      return { stockBaseQtyPerCountSaleUnit: null, stockBaseQtyPerCountPurchaseUnit: null };
    }
    return {
      stockBaseQtyPerCountSaleUnit: raw.stockBaseQtyPerCountSaleUnit ?? null,
      stockBaseQtyPerCountPurchaseUnit: raw.stockBaseQtyPerCountPurchaseUnit ?? null,
    };
  }

  toVariantStockBaseSync(
    variant: ProductVariant,
    quantity: number,
    lineUnitId: string,
    byId: Map<string, Unit>,
    lineContext: VariantQtyLineContext = 'sale',
  ): VariantQtyToBaseResult {
    const stockBaseId = variant.stockBaseUnitId ?? variant.unitId;
    const effectiveLineUnit = (lineUnitId || variant.saleUnitId || variant.unitId).trim();
    const bridges = this.readVariantBridges(variant);
    this.assertVariantUomTriplet(
      stockBaseId,
      variant.saleUnitId ?? variant.unitId,
      variant.purchaseUnitId ?? variant.unitId,
      byId,
      bridges,
    );

    const stockU = byId.get(stockBaseId);
    const lineU = byId.get(effectiveLineUnit);
    if (!stockU || !lineU) {
      throw new BadRequestException('Unidad de línea o de stock no encontrada.');
    }

    const dStock = stockU.dimension;
    const dLine = lineU.dimension;

    if (lineContext === 'neutral' && dLine === UnitDimension.COUNT && isMassVolumeLength(dStock)) {
      throw new BadRequestException(
        'En ajustes/transferencias/inventario use la unidad base de stock, no unidades de conteo con factor de empaque.',
      );
    }

    if (isMassVolumeLength(dStock) && dLine === UnitDimension.COUNT) {
      const expectedUnitId =
        lineContext === 'purchase'
          ? (variant.purchaseUnitId ?? '').trim()
          : (variant.saleUnitId ?? variant.unitId ?? '').trim();
      if (effectiveLineUnit !== expectedUnitId) {
        throw new BadRequestException(
          lineContext === 'purchase'
            ? 'La unidad de conteo de la línea debe coincidir con la unidad de compra de la variante.'
            : 'La unidad de conteo de la línea debe coincidir con la unidad de venta de la variante.',
        );
      }
      const perCount =
        lineContext === 'purchase'
          ? bridges.stockBaseQtyPerCountPurchaseUnit
          : bridges.stockBaseQtyPerCountSaleUnit;
      if (perCount == null || perCount <= 0) {
        throw new BadRequestException('Factor de contenido conteo → stock base no definido para esta variante.');
      }
      const quantityInBase = quantity * perCount;
      const unitConversionFactor = quantity > 0 ? quantityInBase / quantity : perCount;
      const unitOfMeasure = lineU.symbol || lineU.name || '';
      return {
        quantityInBase: Number(quantityInBase.toFixed(6)),
        unitConversionFactor: Number(unitConversionFactor.toFixed(9)),
        unitOfMeasure,
        stockBaseUnitId: stockBaseId,
      };
    }

    const lineRoot = this.dimensionRootId(effectiveLineUnit, byId);
    const stockRoot = this.dimensionRootId(stockBaseId, byId);
    if (lineRoot !== stockRoot) {
      throw new BadRequestException(
        'La unidad de la línea no es convertible a la unidad de stock de la variante.',
      );
    }

    const fLine = this.factorOneUnitToDimensionRoot(effectiveLineUnit, byId);
    const fStock = this.factorOneUnitToDimensionRoot(stockBaseId, byId);
    const qtyRoot = quantity * fLine;
    const quantityInBase = fStock > 0 ? qtyRoot / fStock : qtyRoot;
    const unitConversionFactor = quantity > 0 ? quantityInBase / quantity : fLine / (fStock || 1);
    const unitOfMeasure = lineU.symbol || lineU.name || '';

    return {
      quantityInBase: Number(quantityInBase.toFixed(6)),
      unitConversionFactor: Number(unitConversionFactor.toFixed(9)),
      unitOfMeasure,
      stockBaseUnitId: stockBaseId,
    };
  }

  async unitsMapForCompany(companyId: string): Promise<Map<string, Unit>> {
    const rows = await this.unitRepo.find({
      where: { companyId, deletedAt: IsNull() },
    });
    return new Map(rows.map((u) => [u.id, u]));
  }

  /** Unidades de stock base equivalentes a 1 unidad de compra (p. ej. 1 docena → 12). */
  purchaseQtyToStockBaseFactor(variant: ProductVariant, byId: Map<string, Unit>): number {
    const purchaseUnitId = (variant.purchaseUnitId ?? variant.unitId ?? '').trim();
    if (!purchaseUnitId) {
      return 1;
    }
    try {
      return this.toVariantStockBaseSync(
        variant,
        1,
        purchaseUnitId,
        byId,
        'purchase',
      ).quantityInBase;
    } catch {
      return 1;
    }
  }

  /**
   * Convierte PMP (moneda por 1 unidad base de stock) al costo por 1 unidad de compra de la variante.
   * Usado en búsqueda de compras para prellenar el costo de línea en recepciones.
   */
  async purchaseUnitCostFromPmpForVariant(
    variant: ProductVariant,
    pmp: number | null | undefined,
    companyId: string,
  ): Promise<number | null> {
    const units = await this.unitRepo.find({
      where: { companyId, deletedAt: IsNull() },
    });
    return this.purchaseUnitCostFromPmp(variant, pmp, new Map(units.map((u) => [u.id, u])));
  }

  purchaseUnitCostFromPmp(
    variant: ProductVariant,
    pmp: number | null | undefined,
    byId: Map<string, Unit>,
  ): number | null {
    if (pmp == null || !Number.isFinite(Number(pmp)) || Number(pmp) <= 0) {
      return null;
    }
    const purchaseUnitId = (variant.purchaseUnitId ?? variant.unitId ?? '').trim();
    if (!purchaseUnitId) {
      return null;
    }
    try {
      const r = this.toVariantStockBaseSync(
        variant,
        1,
        purchaseUnitId,
        byId,
        'purchase',
      );
      const basePerPurchase = Number(r.quantityInBase) || 0;
      if (basePerPurchase <= 0) {
        return null;
      }
      return Number((Number(pmp) * basePerPurchase).toFixed(2));
    } catch {
      return null;
    }
  }

  /**
   * Completa `unitId`, `quantityInBase`, `unitConversionFactor`, `unitOfMeasure` en cada línea con variante.
   */
  async enrichCreateTransactionDto(dto: CreateTransactionDto, companyId: string): Promise<void> {
    if (!dto.lines?.length) {
      return;
    }
    const variantIds = [
      ...new Set(
        dto.lines.map((l) => l.productVariantId).filter((id): id is string => typeof id === 'string' && !!id?.trim()),
      ),
    ];
    if (variantIds.length === 0) {
      return;
    }
    const [variants, byId] = await Promise.all([
      this.variantRepo.find({
        where: { id: In(variantIds), companyId, deletedAt: IsNull() },
      }),
      this.unitRepo.find({ where: { companyId, deletedAt: IsNull() } }).then((rows) => new Map(rows.map((u) => [u.id, u]))),
    ]);
    const vmap = new Map(variants.map((v) => [v.id, v]));

    const lineContext: VariantQtyLineContext = PURCHASE_ORIENTED_TYPES.has(dto.transactionType)
      ? 'purchase'
      : STOCK_BASE_DEFAULT_TYPES.has(dto.transactionType)
        ? 'neutral'
        : 'sale';

    for (const line of dto.lines) {
      if (!line.productVariantId) {
        continue;
      }
      const v = vmap.get(line.productVariantId);
      if (!v) {
        throw new BadRequestException(
          `Variante de producto no encontrada o no pertenece a la empresa: ${line.productVariantId}`,
        );
      }
      const defaultUnitForDoc = PURCHASE_ORIENTED_TYPES.has(dto.transactionType)
        ? (v.purchaseUnitId ?? v.unitId)
        : STOCK_BASE_DEFAULT_TYPES.has(dto.transactionType)
          ? (v.stockBaseUnitId ?? v.unitId)
          : (v.saleUnitId ?? v.unitId);
      const lineUnit = (line.unitId ?? defaultUnitForDoc ?? '').trim();
      if (!lineUnit) {
        throw new BadRequestException(
          `Línea sin unitId y variante ${line.productVariantId} sin unidades definidas.`,
        );
      }
      line.unitId = lineUnit;
      const r = this.toVariantStockBaseSync(v, Number(line.quantity) || 0, lineUnit, byId, lineContext);
      (line as any).quantityInBase = r.quantityInBase;
      (line as any).unitConversionFactor = r.unitConversionFactor;
      (line as any).unitOfMeasure = r.unitOfMeasure;
    }
  }
}
