import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { UnitDimension } from './unit-dimension.enum';

const decimalTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

@Index('uq_units_symbol_company', ['symbol', 'companyId'], {
  unique: true,
})
@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_units_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 10 })
  symbol!: string;

  @Column({ type: 'enum', enum: UnitDimension })
  dimension!: UnitDimension;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 9,
    transformer: decimalTransformer,
  })
  conversionFactor!: number;

  @Column({ type: 'boolean', default: true })
  allowDecimals!: boolean;

  @Column({ type: 'boolean', default: false })
  isBase!: boolean;

  @Column({ type: 'uuid', name: 'base_unit_id', nullable: true })
  baseUnitId?: string | null;

  @ManyToOne(() => Unit, (unit) => unit.derivedUnits, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit?: Unit | null;

  @OneToMany(() => Unit, (unit) => unit.baseUnit)
  derivedUnits!: Unit[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
