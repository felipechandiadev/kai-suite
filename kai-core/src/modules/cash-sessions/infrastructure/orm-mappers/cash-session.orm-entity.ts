import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PointOfSaleOrmEntity } from '@modules/points-of-sale/infrastructure/orm-mappers/point-of-sale.orm-entity';
import { UserOrmEntity } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';

export enum CashSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECONCILED = 'RECONCILED',
}

@Entity('cash_sessions')
export class CashSessionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pointOfSaleId?: string;

  @Column({ type: 'uuid', nullable: true })
  openedById?: string;

  @Column({ type: 'uuid', nullable: true })
  closedById?: string;

  @Column({ type: 'varchar', length: 50, default: CashSessionStatus.OPEN })
  status!: CashSessionStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  closingAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  difference?: number;

  @Column({ type: 'timestamp' })
  openedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  closingDetails?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => PointOfSaleOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pointOfSaleId' })
  pointOfSale?: PointOfSaleOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'openedById' })
  openedBy?: UserOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedById' })
  closedBy?: UserOrmEntity;
}
