import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { UserCompanyRole } from './user-company-role.entity';

@Entity('user_company_memberships')
@Unique('uq_user_company_memberships_user_company', ['userId', 'companyId'])
export class UserCompanyMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_ucm_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index('idx_ucm_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  /**
   * Dueño de la empresa. Como máximo uno por companyId (enforce en servicio + índice parcial).
   * Requiere rol ADMIN en roles[].
   */
  @Column({ name: 'is_owner', type: 'boolean', default: false })
  isOwner!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => UserCompanyRole, (r) => r.membership, {
    cascade: true,
    eager: true,
  })
  roles?: UserCompanyRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
