import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_lines')
@Index(['recipeId'])
@Index(['inputVariantId'])
export class RecipeLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_recipe_lines_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  recipeId!: string;

  @Column({ type: 'uuid' })
  inputVariantId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  qtyPerOutputUnit!: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  wasteFactor!: number;

  /** Si true, la línea limita el CTP (capacidad producible) y se reserva al fire. */
  @Column({ type: 'boolean', default: true })
  limitsProjectedStock!: boolean;

  @Column({ type: 'int', default: 1 })
  sortOrder!: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;
}

