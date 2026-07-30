import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum PriceListType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  VIP = 'VIP',
  PROMOTIONAL = 'PROMOTIONAL',
}

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_price_lists_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: PriceListType, default: PriceListType.RETAIL })
  priceListType!: PriceListType;

  @Column({ type: 'varchar', length: 10, default: 'CLP' })
  currency!: string;

  @Column({ type: 'date', nullable: true })
  validFrom?: Date;

  @Column({ type: 'date', nullable: true })
  validUntil?: Date;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Lista de sistema (p. ej. eShop): no se puede eliminar. */
  @Column({ type: 'boolean', default: false, name: 'non_deletable' })
  nonDeletable!: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Note: PriceListItem has ManyToOne to PriceList
  // We don't define inverse OneToMany here to avoid circular metadata issues
}
