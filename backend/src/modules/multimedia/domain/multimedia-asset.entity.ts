import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MultimediaLink } from './multimedia-link.entity';
import { MultimediaVariant } from './multimedia-variant.entity';

export type MultimediaKind = 'image' | 'document' | 'other';
export type MultimediaStorageProvider = 'local' | 'cloudflare';
export type MultimediaStatus = 'active' | 'deleted';
export type MultimediaOptimizationStatus = 'skipped' | 'ready' | 'failed';

@Entity('multimedia_assets')
export class MultimediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_multimedia_assets_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ type: 'varchar', length: 255 })
  storedName!: string;

  @Column({ type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 500 })
  publicUrl!: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  kind!: MultimediaKind;

  @Column({ type: 'varchar', length: 20, default: 'local' })
  storageProvider!: MultimediaStorageProvider;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: MultimediaStatus;

  @Column({
    name: 'optimization_status',
    type: 'varchar',
    length: 20,
    default: 'skipped',
  })
  optimizationStatus!: MultimediaOptimizationStatus;

  @Column({ type: 'int', nullable: true })
  width?: number | null;

  @Column({ type: 'int', nullable: true })
  height?: number | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => MultimediaLink, (link) => link.asset)
  links?: MultimediaLink[];

  @OneToMany(() => MultimediaVariant, (variant) => variant.asset)
  variants?: MultimediaVariant[];
}
