import { IsObject, IsOptional } from 'class-validator';

export class RunInventoryReportDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
