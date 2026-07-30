import { IsObject, IsOptional } from 'class-validator';

export class RunSalesReportDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
