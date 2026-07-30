// Reception ORM entity mapper (single detailed definition below)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { StorageOrmEntity as Storage } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';
import { BranchOrmEntity as Branch } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { SupplierOrmEntity as Supplier } from '@modules/suppliers/infrastructure/orm-mappers/supplier.orm-entity';
import { UserOrmEntity as User } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';

@Entity('receptions')
@Index(['storageId'])
@Index(['supplierId'])
@Index(['branchId'])
@Index(['createdAt'])
export class ReceptionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: 'direct' })
  type!: string;

  @Column({ type: 'uuid', nullable: true })
  storageId?: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentNumber?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  dteNumber?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  dteType?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'int', default: 0 })
  lineCount!: number;

  @Column({ type: 'uuid', nullable: true })
  transactionId?: string;

  @Column({ type: 'json', nullable: true })
  payments?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Storage, { nullable: true })
  @JoinColumn({ name: 'storageId' })
  storage?: Storage;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @OneToMany('ReceptionLineOrmEntity', 'reception')
  lines?: any[];
}
