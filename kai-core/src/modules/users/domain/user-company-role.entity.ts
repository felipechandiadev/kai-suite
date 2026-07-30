import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserCompanyMembership } from './user-company-membership.entity';
import { PlatformRoleCode } from './platform-role.codes';

@Entity('user_company_roles')
@Unique('uq_user_company_roles_membership_role', ['membershipId', 'role'])
export class UserCompanyRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_ucr_membership_id')
  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId!: string;

  @ManyToOne(() => UserCompanyMembership, (m) => m.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'membership_id' })
  membership?: UserCompanyMembership;

  @Column({
    type: 'varchar',
    length: 40,
  })
  role!: PlatformRoleCode | string;
}
