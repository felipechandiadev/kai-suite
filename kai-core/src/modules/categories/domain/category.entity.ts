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
  Index,
} from 'typeorm';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';

export interface CategoryMediaAsset {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_categories_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  primaryImageUrl?: string | null;

  mediaAssets?: CategoryMediaAsset[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  resultCenterId?: string | null;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resultCenterId' })
  resultCenter?: ResultCenter;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Self-referential relation for hierarchy
  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: Category;

  // Note: Children are queried via parentId
  // We don't define inverse OneToMany here to avoid circular metadata issues
}
