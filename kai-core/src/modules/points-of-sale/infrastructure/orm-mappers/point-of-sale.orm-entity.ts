import 'reflect-metadata';
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
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';

@Entity('points_of_sale')
export class PointOfSaleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'json', nullable: true })
  priceLists?: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;

  @Column({ type: 'uuid', nullable: true })
  defaultPriceListId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: BranchOrmEntity;
}
