import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReceptionOrmEntity as Reception } from '@modules/receptions/infrastructure/orm-mappers/reception.orm-entity';
import { ProductOrmEntity as Product } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { ProductVariantOrmEntity as ProductVariant } from '@modules/product-variants/infrastructure/orm-mappers/product-variant.orm-entity';

@Entity('reception_lines')
@Index(['receptionId'])
@Index(['productVariantId'])
export class ReceptionLineOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  receptionId!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  productVariantId?: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  variantName?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  receivedQuantity?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'int', default: 1 })
  lineNumber!: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  storagePhysicalBefore?: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  storagePhysicalAfter?: number | null;

  @ManyToOne(() => Reception, (reception) => reception.lines)
  @JoinColumn({ name: 'receptionId' })
  reception!: Reception;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'productVariantId' })
  productVariant?: ProductVariant;
}
