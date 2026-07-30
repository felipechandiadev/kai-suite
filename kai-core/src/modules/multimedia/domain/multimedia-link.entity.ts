import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MultimediaAsset } from './multimedia-asset.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';

@Entity('multimedia_links')
@Index('IDX_multimedia_links_entity', ['entityType', 'entityId'])
@Index('idx_multimedia_links_entity_attribute', ['entityType', 'entityId', 'attributeId'])
export class MultimediaLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_multimedia_links_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  assetId!: string;

  @Column({ type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 100 })
  usageType!: string;

  /** Atributo de variante (Color, Talla…); null = galería general. */
  @Column({ type: 'uuid', nullable: true, name: 'attribute_id' })
  attributeId?: string | null;

  @ManyToOne(() => Attribute, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'attribute_id' })
  catalogAttribute?: Attribute | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => MultimediaAsset, (asset) => asset.links, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assetId' })
  asset!: MultimediaAsset;
}