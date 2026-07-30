import { IsObject, IsOptional } from 'class-validator';

export class RunPurchasingReportDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
