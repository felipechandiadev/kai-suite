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
  Index,
} from 'typeorm';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

@Entity('price_list_items')
@Unique(['priceListId', 'productId', 'productVariantId'])
export class PriceListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_price_list_items_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  priceListId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  productVariantId?: string;

  /**
   * Precio neto (sin impuestos) definido para la variante en esta lista.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netPrice!: number;

  /**
   * Precio bruto (con impuestos) precalculado para accesos rápidos.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  grossPrice!: number;

  /**
   * Lista de impuestos aplicados específicamente a este precio.
   * Si es null o vacío, se asume que no hay impuestos adicionales.
   */
  @Column({ type: 'json', nullable: true })
  taxIds?: string[] | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minPrice?: number;

  /**
   * Máximo descuento autorizado (%) sobre el precio de lista.
   * No es un descuento ya aplicado; es un tope para negociación/POS.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxDiscountPercent?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
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
