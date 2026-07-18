import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Person } from '@modules/persons/domain/person.entity';

/**
 * Vínculo User ↔ Person por empresa (Fase 5 / multiempresa).
 */
@Entity('user_company_persons')
@Unique('uq_user_company_persons_user_company', ['userId', 'companyId'])
export class UserCompanyPerson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_ucp_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index('idx_ucp_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'person_id', type: 'uuid' })
  personId!: string;

  @ManyToOne(() => Person, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
