import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';

@Entity('points_of_sale')
export class PointOfSale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_points_of_sale_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @Column({ type: 'json', nullable: true })
  priceLists?: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;

  @Column({ type: 'uuid', nullable: true })
  defaultPriceListId?: string;

  /** Centro de acopio por defecto al consolidar efectivo al cerrar sesión (opcional). */
  @Column({ type: 'uuid', nullable: true })
  defaultCashHubId?: string | null;

  /** Almacén tipo sala de venta (STORE) de la misma sucursal: stock POS y descuentos de venta. */
  @Column({ type: 'uuid', name: 'storage_id', nullable: true })
  storageId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Configuración por POS (medios de pago habilitados/precargados, etc.).
   * Estructura libre para ajustes locales. Validada a nivel servicio.
   */
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @ManyToOne(() => Storage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storage_id' })
  storage?: Storage;

  // Relaciones a PriceList ahora se gestionan vía priceLists JSON

  // Note: CashSession has ManyToOne to PointOfSale
  // We don't define inverse OneToMany here to avoid circular metadata issues
}
