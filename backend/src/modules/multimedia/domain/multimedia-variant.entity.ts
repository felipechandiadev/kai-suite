import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { MultimediaAsset } from './multimedia-asset.entity';

export type MultimediaVariantFormat = 'webp' | 'jpeg' | 'png';

@Entity('multimedia_variants')
@Unique('UQ_multimedia_variants_asset_type_format', [
  'assetId',
  'variantType',
  'format',
])
@Index('idx_multimedia_variants_asset_id', ['assetId'])
export class MultimediaVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  /** Logical size/role: thumb | full | hero_desktop | avatar_md | logo */
  @Column({ name: 'variant_type', type: 'varchar', length: 40 })
  variantType!: string;

  @Column({ type: 'varchar', length: 10 })
  format!: MultimediaVariantFormat;

  @Column({ type: 'int' })
  width!: number;

  @Column({ type: 'int' })
  height!: number;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ name: 'public_url', type: 'varchar', length: 500 })
  publicUrl!: string;

  @Column({ type: 'int', nullable: true })
  quality?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => MultimediaAsset, (asset) => asset.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asset_id' })
  asset?: MultimediaAsset;
}
