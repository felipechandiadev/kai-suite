import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SiiEnvironment } from './fiscal.enums';

@Entity('point_of_sale_folio_allocations')
@Index('uq_pos_folio_alloc_pos_dte_env', ['pointOfSaleId', 'dteType', 'environment'], {
  unique: true,
})
@Index('idx_pos_folio_alloc_company_dte', ['companyId', 'dteType', 'environment'])
@Index('idx_pos_folio_alloc_caf', ['cafId'])
@Index('uq_pos_folio_alloc_company_sub_pack', ['companyId', 'subPackCode'], {
  unique: true,
})
export class PointOfSaleFolioAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'caf_id', type: 'uuid' })
  cafId!: string;

  @Column({ name: 'sub_pack_code', type: 'varchar', length: 64 })
  subPackCode!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label?: string | null;

  @Column({ name: 'point_of_sale_id', type: 'uuid' })
  pointOfSaleId!: string;

  @Column({ name: 'dte_type', type: 'smallint' })
  dteType!: number;

  @Column({ name: 'range_from', type: 'int' })
  rangeFrom!: number;

  @Column({ name: 'range_to', type: 'int' })
  rangeTo!: number;

  @Column({ name: 'next_folio', type: 'int' })
  nextFolio!: number;

  @Column({ type: 'varchar', length: 32, default: SiiEnvironment.PRODUCTION })
  environment!: SiiEnvironment;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
