import { IsOptional, IsString, IsNumber, IsDateString, IsIn } from 'class-validator';
import { MetalType } from '../../domain/metal.enum';

const METAL_TYPES = Object.values(MetalType);

export class UpdateMetalPriceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  valueCLP?: number;

  @IsOptional()
  @IsString()
  @IsIn(METAL_TYPES)
  metal?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
