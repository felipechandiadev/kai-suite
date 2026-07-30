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

@Entity('promotion_scope_customers')
@Index('idx_promotion_scope_customers_promotion', ['promotionId'])
@Index('idx_promotion_scope_customers_customer', ['customerId'])
export class PromotionScopeCustomer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopeCustomers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
