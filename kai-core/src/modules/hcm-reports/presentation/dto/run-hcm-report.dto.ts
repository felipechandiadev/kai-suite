import { IsObject, IsOptional } from 'class-validator';

export class RunHcmReportDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
