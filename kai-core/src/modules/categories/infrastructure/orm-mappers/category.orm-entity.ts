import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResultCenterOrmEntity as ResultCenter } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';

@Entity('categories')
export class CategoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

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

  @ManyToOne(() => CategoryOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: CategoryOrmEntity;
}
