import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

/** Puente M:N unidad organizativa ↔ unidad laboral. */
@Entity('hr_labor_unit_organizational_units')
@Index(['organizationalUnitId'])
@Index(['companyId'])
export class HrLaborUnitOrganizationalUnit {
  @Column({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  laborUnitId!: string;

  @PrimaryColumn({ type: 'uuid' })
  organizationalUnitId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
