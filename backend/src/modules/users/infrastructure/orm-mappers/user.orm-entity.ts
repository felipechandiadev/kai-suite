import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { PersonOrmEntity as Person } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  COURIER = 'COURIER',
}

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  userName!: string;

  @Column('varchar')
  pass!: string;

  @Column('varchar')
  mail!: string;

  @Column({ type: 'varchar', length: 50, default: UserRole.OPERATOR })
  rol!: UserRole;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  person?: Person;

  @Column({ type: 'boolean', default: false })
  nonDeletable!: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
