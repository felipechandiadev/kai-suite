import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateNested, IsNumber } from 'class-validator';
import { RecipeType } from '../../domain/recipe-type.enum';

export class CreateRecipeLineDto {
  @IsUUID()
  inputVariantId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qtyPerOutputUnit!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wasteFactor?: number;

  @IsOptional()
  @IsBoolean()
  limitsProjectedStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}

export class CreateRecipeDto {
  @IsUUID()
  outputVariantId!: string;

  @IsEnum(RecipeType)
  type!: RecipeType;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeLineDto)
  lines!: CreateRecipeLineDto[];
}

