import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * Atributo para variantes de producto.
 * Ejemplos: Color, Talla, Peso, Material, Capacidad
 *
 * Las opciones se guardan como JSON array para simplicidad.
 * Ejemplo: ["Rojo", "Azul", "Verde"] para Color
 *          ["S", "M", "L", "XL"] para Talla
 *          ["500ml", "1L", "2L"] para Capacidad
 */
@Index('uq_attributes_name_company', ['name', 'companyId'], { unique: true })
@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_attributes_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  /**
   * Nombre del atributo (ej: "Color", "Talla", "Peso")
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Descripción opcional del atributo
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Opciones disponibles para este atributo
   * Guardadas como JSON array: ["Opción1", "Opción2", "Opción3"]
   */
  @Column({ type: 'json' })
  options!: string[];

  /**
   * Orden de visualización
   */
  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
