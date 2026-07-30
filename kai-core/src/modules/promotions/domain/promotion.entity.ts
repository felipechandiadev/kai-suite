import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionType,
} from './promotion.enums';
import { PromotionScopeBranch } from './promotion-scope-branch.entity';
import { PromotionScopePos } from './promotion-scope-pos.entity';
import { PromotionScopeProduct } from './promotion-scope-product.entity';
import { PromotionScopeVariant } from './promotion-scope-variant.entity';
import { PromotionScopeCategory } from './promotion-scope-category.entity';
import { PromotionScopeCustomer } from './promotion-scope-customer.entity';
import { PromotionScopePaymentMethod } from './promotion-scope-payment-method.entity';

/**
 * Promoción / descuento configurable a nivel empresa, opcionalmente
 * limitada por sucursales, puntos de venta, productos, categorías,
 * clientes o métodos de pago (ver tablas pivote `promotion_scope_*`).
 *
 * El ciclo de vida es:
 *   1. Admin la crea (PR 3).
 *   2. POS la lee desde `/api/pos/me/promotions` y la aplica con el
 *      motor en cliente (PR 4).
 *   3. Al cerrar la venta el backend re-valida con el mismo motor y
 *      registra una `PromotionRedemption` actualizando `usesCount` de
 *      forma atómica (PR 5).
 */
@Entity('promotions')
@Index('idx_promotions_company_active_until', [
  'companyId',
  'isActive',
  'validUntil',
])
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_promotions_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  /** Identificador interno (e.g. "BLACK-FRIDAY-25"). Único por empresa. */
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: PromotionType })
  type!: PromotionType;

  /**
   * Significado según `type`:
   *  - PERCENT_*  → porcentaje en [0..100] (e.g. `15` = 15 %).
   *  - AMOUNT_*   → monto fijo en moneda (CLP entero esperado).
   *  - PRICE_OVERRIDE → unitPrice forzado.
   *  - BUY_X_GET_Y → ignorado (se usan buyQuantity/getQuantity/getDiscountPercent).
   */
  @Column({ type: 'decimal', precision: 19, scale: 4, default: 0 })
  value!: number;

  /**
   * Tope opcional al monto descontado por aplicación. Permite cosas como
   * "20% pero máximo CLP 50.000". `null` = sin tope.
   */
  @Column({ type: 'decimal', precision: 19, scale: 2, nullable: true })
  maxValue?: number | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  validFrom?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  validUntil?: Date | null;

  @Column({
    type: 'enum',
    enum: PromotionActivation,
    default: PromotionActivation.AUTO,
  })
  activation!: PromotionActivation;

  /** Cupón requerido cuando `activation = CODE_ENTRY`. Único por empresa. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  redemptionCode?: string | null;

  /**
   * Si `false`, esta promoción no se combina con ninguna otra; la de
   * mayor `priority` aplicable gana.
   */
  @Column({ type: 'boolean', default: true })
  stackable!: boolean;

  /**
   * Orden de evaluación. Mayor número primero. Útil para resolver
   * conflictos entre promociones no-stackable.
   */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  /** Subtotal mínimo del carrito (suma de líneas elegibles) para aplicar. */
  @Column({ type: 'decimal', precision: 19, scale: 2, nullable: true })
  minSubtotal?: number | null;

  @Column({ type: 'int', nullable: true })
  minQuantity?: number | null;

  /** Días de la semana habilitados (0=domingo..6=sábado). `null` = todos. */
  @Column({ type: 'int', array: true, nullable: true })
  daysOfWeek?: number[] | null;

  /** Hora inicio (formato 'HH:MM:SS'). `null` = sin restricción. */
  @Column({ type: 'time', nullable: true })
  hourFrom?: string | null;

  @Column({ type: 'time', nullable: true })
  hourTo?: string | null;

  /** Tope global de usos (incluye todos los clientes). `null` = ilimitado. */
  @Column({ type: 'int', nullable: true })
  maxUsesTotal?: number | null;

  @Column({ type: 'int', nullable: true })
  maxUsesPerCustomer?: number | null;

  /** Contador atómico que se incrementa en cierre de venta (PR 5). */
  @Column({ type: 'int', default: 0 })
  usesCount!: number;

  @Column({
    type: 'enum',
    enum: PromotionAuthorization,
    default: PromotionAuthorization.NONE,
  })
  authorization!: PromotionAuthorization;

  /**
   * Porcentaje máximo que un cajero puede descontar manualmente sin
   * subir nivel de autorización. Solo relevante si
   * `authorization = CASHIER`. Ej.: `5` = el cajero recorta automáticamente
   * cualquier porcentaje > 5 %.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  authorizationLimitPct?: number | null;

  /** Solo para `BUY_X_GET_Y`. */
  @Column({ type: 'int', nullable: true })
  buyQuantity?: number | null;

  @Column({ type: 'int', nullable: true })
  getQuantity?: number | null;

  /**
   * Porcentaje aplicado a las `getQuantity` unidades "regalo"
   * (0..100). 100 = gratis.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  getDiscountPercent?: number | null;

  /**
   * Si `true`, el POS pre-carga la promoción en la pantalla de pago
   * para que el cajero la vea sin tener que activarla manualmente.
   */
  @Column({ type: 'boolean', default: false })
  preloadOnPaymentScreen!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  /**
   * Etiqueta libre para reglas contables — la automation existente
   * busca reglas por tag para distribuir el `discountAmount`.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  accountingTag?: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;

  @OneToMany(() => PromotionScopeBranch, (s) => s.promotion)
  scopeBranches?: PromotionScopeBranch[];

  @OneToMany(() => PromotionScopePos, (s) => s.promotion)
  scopePos?: PromotionScopePos[];

  @OneToMany(() => PromotionScopeProduct, (s) => s.promotion)
  scopeProducts?: PromotionScopeProduct[];

  @OneToMany(() => PromotionScopeVariant, (s) => s.promotion)
  scopeVariants?: PromotionScopeVariant[];

  @OneToMany(() => PromotionScopeCategory, (s) => s.promotion)
  scopeCategories?: PromotionScopeCategory[];

  @OneToMany(() => PromotionScopeCustomer, (s) => s.promotion)
  scopeCustomers?: PromotionScopeCustomer[];

  @OneToMany(() => PromotionScopePaymentMethod, (s) => s.promotion)
  scopePaymentMethods?: PromotionScopePaymentMethod[];
}
