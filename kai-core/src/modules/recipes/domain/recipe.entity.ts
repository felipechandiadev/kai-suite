import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { RecipeType } from './recipe-type.enum';
import { RecipeLine } from './recipe-line.entity';

@Entity('recipes')
@Index(['outputVariantId', 'isActive'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_recipes_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  outputVariantId!: string;

  @Column({ type: 'enum', enum: RecipeType })
  type!: RecipeType;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => RecipeLine, (line) => line.recipe, { cascade: true })
  lines!: RecipeLine[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

