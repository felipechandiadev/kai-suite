// Unit ORM entity mapper (detailed definition below)
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
import { UnitDimension } from '../../domain/unit-dimension.enum';

const decimalTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

@Index('uq_units_symbol_company', ['symbol', 'companyId'], { unique: true })
@Entity('units')
export class UnitOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_units_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 10 })
  symbol!: string;

  @Column({ type: 'varchar', length: 50 })
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

  @ManyToOne(() => UnitOrmEntity, (unit) => unit.derivedUnits, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit?: UnitOrmEntity | null;

  @OneToMany(() => UnitOrmEntity, (unit) => unit.baseUnit)
  derivedUnits!: UnitOrmEntity[];

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
