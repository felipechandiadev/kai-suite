import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('assistant_favorites')
@Index('idx_assistant_favorites_user', ['companyId', 'userId'])
export class AssistantFavorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
