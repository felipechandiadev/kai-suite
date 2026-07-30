import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import type { PmpHistoryEntry } from './pmp-history.types';
import type { SalePriceHistoryEntry } from './sale-price-history.types';
import {
  DEFAULT_VARIANT_TAX_CATEGORY,
  type VariantTaxCategory,
} from './variant-tax-category';

export interface ProductVariantMediaAsset {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
}

/**
 * ProductVariant es donde vive el SKU, precio, costo y datos de inventario.
 * Todo producto tiene al menos una variante.
 * Para productos simples, se crea automáticamente una variante "default".
 *
 * La variante NO tiene nombre propio - se identifica por el producto + sus atributos.
 * Ejemplo: "Camiseta Nike" + {Color: "Rojo", Talla: "M"} = "Camiseta Nike - Rojo, M"
 */
@Index('uq_product_variants_sku_company', ['sku', 'companyId'], { unique: true })
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_product_variants_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  /**
   * Precio base de venta (sin impuestos)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basePrice!: number;

  /**
   * Costo/PPP (Precio Promedio Ponderado)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  baseCost!: number;

  /**
   * Override de mano de obra por pieza (manufactura). Si está definido,
   * reemplaza la tasa MO histórica de la unidad de producción.
   */
  @Column({
    name: 'labor_cost_override',
    type: 'decimal',
    precision: 15,
    scale: 6,
    nullable: true,
  })
  laborCostOverride?: number | null;

  /**
   * PMP global de la variante: moneda por **1 unidad base de stock** (alineado con `stock_levels.physicalStock`).
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  pmp!: number | null;

  /**
   * Historial de cambios de PMP (append-only en aplicación). El valor vigente sigue en `pmp`.
   */
  @Column({ type: 'json', nullable: true })
  pmpHistory?: PmpHistoryEntry[] | null;

  /**
   * Historial de precios de venta por lista (append-only). Vigente en `priceListItems` y `basePrice`.
   */
  @Column({ type: 'json', nullable: true })
  salePriceHistory?: SalePriceHistoryEntry[] | null;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  /** @deprecated Mantener alineado con `saleUnitId` (compat API / clientes viejos). */
  @ManyToOne(() => Unit, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  /** Unidad canónica de inventario y costo (saldo en `stock_levels`). */
  @Column({ type: 'uuid', name: 'stock_base_unit_id' })
  stockBaseUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_base_unit_id' })
  stockBaseUnit!: Unit;

  /** Unidad por defecto en ventas (POS, factura, etc.). */
  @Column({ type: 'uuid', name: 'sale_unit_id' })
  saleUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_unit_id' })
  saleUnit!: Unit;

  /** Unidad por defecto en compras (OC, recepción). */
  @Column({ type: 'uuid', name: 'purchase_unit_id' })
  purchaseUnitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit!: Unit;

  /**
   * Cuando `saleUnit` es de conteo y `stockBaseUnit` es masa/volumen/longitud:
   * cantidad de **unidad base de stock** equivalente a **1** unidad de venta (p. ej. 250 g por 1 bolsa).
   */
  @Column({
    name: 'stock_base_qty_per_count_sale_unit',
    type: 'decimal',
    precision: 18,
    scale: 9,
    nullable: true,
  })
  stockBaseQtyPerCountSaleUnit?: number | string | null;

  /**
   * Igual que `stockBaseQtyPerCountSaleUnit` para la unidad de **compra** en conteo.
   */
  @Column({
    name: 'stock_base_qty_per_count_purchase_unit',
    type: 'decimal',
    precision: 18,
    scale: 9,
    nullable: true,
  })
  stockBaseQtyPerCountPurchaseUnit?: number | string | null;

  /** Peso neto del producto (sin embalaje), en kg. */
  @Column({
    name: 'net_weight_kg',
    type: 'decimal',
    precision: 14,
    scale: 6,
    nullable: true,
  })
  netWeightKg?: number | string | null;

  /** Peso bruto con embalaje (valor típico a informar al transportista), en kg. */
  @Column({
    name: 'gross_weight_kg',
    type: 'decimal',
    precision: 14,
    scale: 6,
    nullable: true,
  })
  grossWeightKg?: number | string | null;

  /** Largo del empaque (cm). */
  @Column({
    name: 'package_length_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageLengthCm?: number | string | null;

  /** Ancho del empaque (cm). */
  @Column({
    name: 'package_width_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageWidthCm?: number | string | null;

  /** Alto del empaque (cm). */
  @Column({
    name: 'package_height_cm',
    type: 'decimal',
    precision: 12,
    scale: 3,
    nullable: true,
  })
  packageHeightCm?: number | string | null;

  /**
   * Divisor K en peso volumétrico kg = (L×W×H cm³) / K.
   * Si es null, la aplicación puede usar un default (p. ej. 5000).
   */
  @Column({ name: 'volumetric_divisor_k', type: 'int', nullable: true })
  volumetricDivisorK?: number | null;

  /**
   * Valores de atributos para esta variante.
   * Formato: { "attributeId1": "opción seleccionada", "attributeId2": "opción seleccionada" }
   * Ejemplo: { "uuid-color": "Rojo", "uuid-talla": "M" }
   *
   * Para productos sin atributos, este campo puede estar vacío o null.
   */
  @Column({ type: 'json', nullable: true })
  attributeValues?: Record<string, string>;

  /**
   * Array de IDs de impuestos aplicables a esta variante
   * Si está vacío o null, se usan los impuestos por defecto del producto
   */
  @Column({ type: 'json', nullable: true })
  taxIds?: string[];

  /** Tratamiento tributario de venta (SII). */
  @Column({ name: 'tax_category', type: 'varchar', length: 40, default: DEFAULT_VARIANT_TAX_CATEGORY })
  taxCategory!: VariantTaxCategory;

  /** Si la venta debe emitir DTE (boleta/factura) ante el SII. */
  @Column({ name: 'requires_dte', type: 'boolean', default: true })
  requiresDte!: boolean;

  /**
   * Si se controla inventario para esta variante
   */
  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  /**
   * Si se permite stock negativo para esta variante
   */
  @Column({ type: 'boolean', default: false })
  allowNegativeStock!: boolean;

  /**
   * Niveles de stock para control de inventario
   */
  @Column({ type: 'int', default: 0 })
  minimumStock!: number;

  @Column({ name: 'minimum_stock_enabled', type: 'boolean', default: false })
  minimumStockEnabled!: boolean;

  @Column({ type: 'int', default: 0 })
  maximumStock!: number;

  @Column({ name: 'maximum_stock_enabled', type: 'boolean', default: false })
  maximumStockEnabled!: boolean;

  @Column({ type: 'int', default: 0 })
  reorderPoint!: number;

  @Column({ name: 'reorder_point_enabled', type: 'boolean', default: false })
  reorderPointEnabled!: boolean;

  primaryImageUrl?: string | null;

  mediaAssets?: ProductVariantMediaAsset[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'visible_in_e_shop', type: 'boolean', default: false })
  visibleInEShop!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @OneToMany(
    () => PriceListItem,
    (priceListItem) => priceListItem.productVariant,
  )
  priceListItems?: PriceListItem[];
}
