import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

/** Puente M:N almacén ↔ unidad laboral. */
@Entity('hr_labor_unit_storages')
@Index(['storageId'])
@Index(['companyId'])
export class HrLaborUnitStorage {
  @Column({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  laborUnitId!: string;

  @PrimaryColumn({ type: 'uuid' })
  storageId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
