import { IsOptional, IsString, IsNumber, IsDateString, IsIn } from 'class-validator';
import { MetalType } from '../../domain/metal.enum';

const METAL_TYPES = Object.values(MetalType);

export class CreateMetalPriceDto {
  @IsDateString()
  date: string;

  @IsNumber()
  valueCLP: number;

  @IsString()
  @IsIn(METAL_TYPES)
  metal: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
