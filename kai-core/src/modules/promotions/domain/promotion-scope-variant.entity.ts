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

@Entity('promotion_scope_variants')
@Index('idx_promotion_scope_variants_promotion', ['promotionId'])
@Index('idx_promotion_scope_variants_variant', ['productVariantId'])
export class PromotionScopeVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopeVariants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
