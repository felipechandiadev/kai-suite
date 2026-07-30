import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * Registro inmutable de cada aplicación efectiva de una promoción a una
 * transacción cerrada. Permite reportes "promociones más usadas",
 * límites por cliente y reversión (PR 5).
 */
@Entity('promotion_redemptions')
@Index('idx_promotion_redemptions_promotion_applied', ['promotionId', 'appliedAt'])
@Index('idx_promotion_redemptions_customer_promotion', ['customerId', 'promotionId'])
@Index('idx_promotion_redemptions_transaction', ['transactionId'])
export class PromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_promotion_redemptions_company')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string | null;

  /** Monto efectivamente descontado por ESTA promoción en la transacción. */
  @Column({ name: 'amount_discounted', type: 'decimal', precision: 19, scale: 2 })
  amountDiscounted!: number;

  /**
   * Snapshot del estado de la promoción y de cómo se aplicó al cierre.
   * Inmutable: sobrevive ediciones futuras de la regla.
   */
  @Column({ type: 'jsonb' })
  snapshot!: Record<string, any>;

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt!: Date;

  @ManyToOne(() => Promotion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;
}
