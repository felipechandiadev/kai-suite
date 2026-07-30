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

@Entity('promotion_scope_products')
@Index('idx_promotion_scope_products_promotion', ['promotionId'])
@Index('idx_promotion_scope_products_product', ['productId'])
export class PromotionScopeProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopeProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
