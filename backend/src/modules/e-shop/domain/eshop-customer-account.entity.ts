import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('eshop_customer_accounts')
@Index('idx_eshop_customer_accounts_company_email', ['companyId', 'email'], {
  unique: true,
})
export class EshopCustomerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'session_token', type: 'uuid', nullable: true })
  sessionToken?: string | null;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 64, nullable: true })
  emailVerificationToken?: string | null;

  @Column({ name: 'password_reset_token', type: 'varchar', length: 64, nullable: true })
  passwordResetToken?: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'timestamp', nullable: true })
  passwordResetExpiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
