import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

/** Puente M:N unidad productiva ↔ unidad laboral. */
@Entity('hr_labor_unit_production_units')
@Index(['productionUnitId'])
@Index(['companyId'])
export class HrLaborUnitProductionUnit {
  @Column({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  laborUnitId!: string;

  @PrimaryColumn({ type: 'uuid' })
  productionUnitId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
