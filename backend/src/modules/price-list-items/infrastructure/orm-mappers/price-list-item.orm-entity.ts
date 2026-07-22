// PriceListItem ORM entity mapper (detailed definition below)
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
  Unique,
} from 'typeorm';
import { PriceListOrmEntity as PriceList } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';
import { ProductOrmEntity as Product } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { ProductVariantOrmEntity as ProductVariant } from '@modules/product-variants/infrastructure/orm-mappers/product-variant.orm-entity';

@Entity('price_list_items')
@Unique(['priceListId', 'productId', 'productVariantId'])
export class PriceListItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  priceListId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  productVariantId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  grossPrice!: number;

  @Column({ type: 'json', nullable: true })
  taxIds?: string[] | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minPrice?: number;

  /** Máximo descuento autorizado (%) sobre el precio de lista. */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxDiscountPercent?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => PriceList, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'priceListId' })
  priceList?: PriceList;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productVariantId' })
  productVariant?: ProductVariant;
}
