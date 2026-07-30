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

@Entity('promotion_scope_pos')
@Index('idx_promotion_scope_pos_promotion', ['promotionId'])
@Index('idx_promotion_scope_pos_pos', ['pointOfSaleId'])
export class PromotionScopePos {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'point_of_sale_id', type: 'uuid' })
  pointOfSaleId!: string;

  @Column({ type: 'enum', enum: PromotionScopeMode, default: PromotionScopeMode.INCLUDE })
  mode!: PromotionScopeMode;

  @ManyToOne(() => Promotion, (p) => p.scopePos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;
}
