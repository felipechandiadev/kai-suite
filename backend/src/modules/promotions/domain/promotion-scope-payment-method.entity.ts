import 'reflect-metadata';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';
import { PromotionScopeMode } from './promotion.enums';

/**
 * Scope por método de pago de la empresa. Permite reglas tipo
 * "10% pagando con tarjeta X". El `companyPaymentMethodId` referencia
 * `company_payment_methods.id` (tabla).
 */
@Entity('promotion_scope_payment_methods')
@Index('idx_promotion_scope_pm_promotion', ['promotionId'])
@Index('idx_promotion_scope_pm_method', ['companyPaymentMethodId'])
export class PromotionScopePaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'company_payment_method_id', type: 'uuid' })
  companyPaymentMethodId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopePaymentMethods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
