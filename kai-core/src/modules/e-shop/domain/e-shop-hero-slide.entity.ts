import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EShopHeroSlideTextAlign = 'left' | 'center' | 'right';
export type EShopHeroSlideCtaStyle = 'none' | 'button' | 'link';

@Entity('e_shop_hero_slides')
@Index('idx_e_shop_hero_slides_company_id', ['companyId'])
export class EShopHeroSlide {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  subtitle!: string | null;

  @Column({ name: 'cta_label', type: 'varchar', length: 80, nullable: true })
  ctaLabel!: string | null;

  @Column({ name: 'cta_href', type: 'varchar', length: 500, nullable: true })
  ctaHref!: string | null;

  @Column({ name: 'cta_style', type: 'varchar', length: 10, default: 'none' })
  ctaStyle!: EShopHeroSlideCtaStyle;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({
    name: 'text_align',
    type: 'varchar',
    length: 10,
    default: 'left',
  })
  textAlign!: EShopHeroSlideTextAlign;

  @Column({ name: 'overlay_opacity', type: 'smallint', default: 45 })
  overlayOpacity!: number;

  @Column({ name: 'text_color', type: 'varchar', length: 7, nullable: true })
  textColor!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
