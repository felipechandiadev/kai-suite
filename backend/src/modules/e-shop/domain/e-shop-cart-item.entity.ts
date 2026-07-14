import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EShopCart } from './e-shop-cart.entity';

@Entity('e_shop_cart_items')
@Index('uq_e_shop_cart_items_cart_variant', ['cartId', 'productVariantId'], {
  unique: true,
})
export class EShopCartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  @ManyToOne(() => EShopCart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: EShopCart;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  quantity!: number;

  @Column({ name: 'unit_price_snapshot', type: 'numeric', precision: 15, scale: 2 })
  unitPriceSnapshot!: number;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 255 })
  productNameSnapshot!: string;

  @Column({ name: 'variant_name_snapshot', type: 'varchar', length: 255 })
  variantNameSnapshot!: string;

  @Column({ name: 'image_url_snapshot', type: 'text', nullable: true })
  imageUrlSnapshot!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
