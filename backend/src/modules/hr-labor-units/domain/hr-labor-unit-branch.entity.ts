import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

/** Puente M:N sucursal ↔ unidad laboral. */
@Entity('hr_labor_unit_branches')
@Index(['branchId'])
@Index(['companyId'])
export class HrLaborUnitBranch {
  @Column({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  laborUnitId!: string;

  @PrimaryColumn({ type: 'uuid' })
  branchId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
