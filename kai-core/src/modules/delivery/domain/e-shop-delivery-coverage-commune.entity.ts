import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_coverage_communes')
@Index('uq_delivery_communes_company_code', ['companyId', 'code'], {
  unique: true,
})
export class EShopDeliveryCoverageCommune {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  province!: string;

  @Column({ name: 'region_code', type: 'varchar', length: 64, default: 'maule' })
  regionCode!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
