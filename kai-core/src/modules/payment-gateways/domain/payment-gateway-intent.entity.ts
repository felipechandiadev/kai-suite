import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  PaymentGatewayChannel,
  PaymentGatewayIntentMetadata,
  PaymentGatewayIntentStatus,
} from './payment-gateway-intent.types';

@Entity('payment_gateway_intents')
@Index('idx_payment_gateway_intents_company_id', ['companyId'])
@Index('idx_payment_gateway_intents_external_reference', ['externalReference'], {
  unique: true,
})
@Index('idx_payment_gateway_intents_mp_payment_id', ['mpPaymentId'], {
  unique: true,
  where: '"mp_payment_id" IS NOT NULL',
})
export class PaymentGatewayIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 32 })
  channel!: PaymentGatewayChannel;

  @Column({ type: 'varchar', length: 32 })
  status!: PaymentGatewayIntentStatus;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency!: string;

  @Column({ name: 'mp_payment_id', type: 'varchar', length: 64, nullable: true })
  mpPaymentId!: string | null;

  @Column({ name: 'mp_order_id', type: 'varchar', length: 64, nullable: true })
  mpOrderId!: string | null;

  @Column({ name: 'external_reference', type: 'varchar', length: 200 })
  externalReference!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 120 })
  idempotencyKey!: string;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId!: string | null;

  @Column({ name: 'point_of_sale_id', type: 'uuid', nullable: true })
  pointOfSaleId!: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: PaymentGatewayIntentMetadata | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
