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

@Entity('promotion_scope_categories')
@Index('idx_promotion_scope_categories_promotion', ['promotionId'])
@Index('idx_promotion_scope_categories_category', ['categoryId'])
export class PromotionScopeCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopeCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
