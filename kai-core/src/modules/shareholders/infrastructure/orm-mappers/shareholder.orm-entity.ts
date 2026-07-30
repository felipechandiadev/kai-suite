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
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';

@Entity('shareholders')
@Index(['companyId', 'isActive'])
@Index(['companyId', 'personId'], { unique: true })
export class ShareholderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  role?: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ownershipPercentage?: number | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  partnerType?: string | null;

  @Column({ type: 'date', nullable: true })
  joinDate?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company?: CompanyOrmEntity;

  @ManyToOne(() => PersonOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person?: PersonOrmEntity;
}
