import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';

export enum UserRole {
  /**
   * Super-administrador del deploy. No está atado a ninguna empresa:
   * gestiona todas las empresas del cliente, switchea entre ellas con
   * `X-Active-Company-Id` y administra otros super-admins.
   */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /**
   * Administrador de UNA empresa específica. Tiene el control completo
   * sobre la configuración y operación de su empresa, pero no puede ver
   * ni operar otras empresas del deploy.
   */
  ADMIN = 'ADMIN',
  /**
   * Subadministrador: una sola empresa; nunca modo multiempresa.
   */
  SUB_ADMIN = 'SUB_ADMIN',
  /**
   * Operador (cajero, vendedor) de UNA empresa específica. Acceso al
   * POS y operación día a día, sin permisos de configuración global.
   * @deprecated Prefer POS_OPERATOR in memberships; kept for dual-read.
   */
  OPERATOR = 'OPERATOR',
  /**
   * Operador POS (memberships / nuevo código canónico).
   */
  POS_OPERATOR = 'POS_OPERATOR',
  /**
   * Repartidor de pedidos de delivery (app kai-delivery).
   */
  COURIER = 'COURIER',
  WAITER = 'WAITER',
  STOCK_OPERATOR = 'STOCK_OPERATOR',
  KDS_OPERATOR = 'KDS_OPERATOR',
}

@Entity('users')
@Check(
  'users_role_company_chk',
  `(rol = 'SUPER_ADMIN' AND company_id IS NULL) OR (rol <> 'SUPER_ADMIN' AND company_id IS NOT NULL)`,
)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  userName!: string;

  @Column('varchar')
  pass!: string;

  @Column('varchar')
  mail!: string;

  /**
   * @deprecated Prefer memberships (`user_company_roles`). Kept for dual-read/write.
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.POS_OPERATOR,
  })
  rol!: UserRole;

  /**
   * Empresa legacy (1:1). Prefer `user_company_memberships`.
   * - SUPER_ADMIN: NULL.
   * - Otros: NOT NULL mientras exista dual-write.
   * @deprecated
   */
  @Index('idx_users_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  person?: Person;

  /**
   * Cuando es `true`, el usuario no puede ser eliminado (soft-delete
   * bloqueado). Se usa para proteger al super-admin del seed y
   * garantizar siempre un acceso de recuperación. Mismo patrón que
   * `Tax.nonDeletable`.
   */
  @Column({ type: 'boolean', default: false })
  nonDeletable!: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
