import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';

export enum ResultCenterType {
  DIRECT = 'DIRECT', // Centros que generan ingresos y gastos directos (ej: Sucursal, Proyecto)
  SUPPORT = 'SUPPORT', // Centros de apoyo/servicio que distribuyen costos (ej: Logística, TI)
  ADMIN = 'ADMIN', // Gestión corporativa
  INVESTMENT = 'INVESTMENT', // Proyectos de inversión o I+D
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

@Entity('result_centers')
export class ResultCenter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ResultCenterType,
    default: ResultCenterType.OTHER,
  })
  type!: ResultCenterType;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ResultCenter, (rc) => rc.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: ResultCenter | null;

  @OneToMany(() => ResultCenter, (rc) => rc.parent)
  children?: ResultCenter[];

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;
}
