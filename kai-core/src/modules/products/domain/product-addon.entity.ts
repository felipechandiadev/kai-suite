import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

/** Producto host → producto agregado elegible (todas las variantes del host). */
@Entity('product_addons')
@Unique('uq_product_addons_host_addon', ['hostProductId', 'addonProductId'])
@Index('idx_product_addons_company_id', ['companyId'])
@Index('idx_product_addons_host_product_id', ['hostProductId'])
export class ProductAddon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'host_product_id', type: 'uuid' })
  hostProductId!: string;

  @Column({ name: 'addon_product_id', type: 'uuid' })
  addonProductId!: string;

  @Column({ name: 'sort_order', type: 'int', default: 1 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_product_id' })
  hostProduct?: Product;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'addon_product_id' })
  addonProduct?: Product;
}
