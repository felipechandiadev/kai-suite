import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dining_branch_settings')
@Unique('uq_dining_branch_settings_branch', ['branchId'])
@Index('idx_dining_branch_settings_company_id', ['companyId'])
export class DiningBranchSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 64, default: 'America/Santiago' })
  timezone!: string;

  /** Hora local HH:mm:ss del corte del día operativo. */
  @Column({
    name: 'reset_time_local',
    type: 'varchar',
    length: 8,
    default: '00:00:01',
  })
  resetTimeLocal!: string;

  /** kai-waiter puede abrir cuentas de mesa. */
  @Column({
    name: 'allow_waiter_open_table',
    type: 'boolean',
    default: true,
  })
  allowWaiterOpenTable!: boolean;

  /** POS /accounts puede abrir cuentas de mesa. */
  @Column({
    name: 'allow_pos_open_table',
    type: 'boolean',
    default: true,
  })
  allowPosOpenTable!: boolean;

  /**
   * Categorías visibles en el menú central de /accounts.
   * Vacío = todas las categorías de la compañía.
   */
  @Column({
    name: 'pos_accounts_menu_category_ids',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  posAccountsMenuCategoryIds!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
