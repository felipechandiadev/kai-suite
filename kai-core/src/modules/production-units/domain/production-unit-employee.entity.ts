import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

/** Empleados asociados directamente a una unidad de producción. */
@Entity('production_unit_employees')
@Index('idx_pu_employees_production_unit', ['productionUnitId'])
@Index('idx_pu_employees_company', ['companyId'])
@Index('uq_pu_employees_company_employee', ['companyId', 'employeeId'], {
  unique: true,
})
export class ProductionUnitEmployee {
  @Column({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  productionUnitId!: string;

  @PrimaryColumn({ type: 'uuid' })
  employeeId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
