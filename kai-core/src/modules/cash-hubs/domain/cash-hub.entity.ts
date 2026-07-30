import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

@Entity('cash_hubs')
export class CashHub {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  code?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => Branch, { cascade: false })
  @JoinTable({
    name: 'cash_hub_branches',
    joinColumn: { name: 'cashHubId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'branchId', referencedColumnName: 'id' },
  })
  branches!: Branch[];

  @ManyToMany(() => PointOfSale, { cascade: false })
  @JoinTable({
    name: 'cash_hub_points_of_sale',
    joinColumn: { name: 'cashHubId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'pointOfSaleId', referencedColumnName: 'id' },
  })
  pointsOfSale!: PointOfSale[];
}
