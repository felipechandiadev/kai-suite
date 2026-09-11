import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PricingCalculateDto {
  @IsOptional()
  @IsString()
  weekIso?: string;

  @IsUUID()
  priceListId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  targetMarginPercent?: number;

  @IsOptional()
  @IsString()
  salesWindowWeekIso?: string;
}

export class PricingSnapshotsQueryDto {
  @IsOptional()
  @IsString()
  weekIso?: string;
}
