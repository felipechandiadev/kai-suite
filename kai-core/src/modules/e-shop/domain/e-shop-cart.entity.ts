import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EShopCartItem } from './e-shop-cart-item.entity';

export type EShopCartStatus =
  | 'active'
  | 'checkout_locked'
  | 'converted'
  | 'abandoned';

@Entity('e_shop_carts')
@Index('idx_e_shop_carts_company_customer', ['companyId', 'customerId'])
export class EShopCart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'cart_token', type: 'uuid', unique: true })
  cartToken!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: EShopCartStatus;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'locked_reason', type: 'varchar', length: 120, nullable: true })
  lockedReason!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'checkout_attempt_id', type: 'uuid', nullable: true })
  checkoutAttemptId!: string | null;

  @OneToMany(() => EShopCartItem, (item) => item.cart)
  items!: EShopCartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
