import { IsObject, IsOptional } from 'class-validator';

export class RunDiningReportDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
