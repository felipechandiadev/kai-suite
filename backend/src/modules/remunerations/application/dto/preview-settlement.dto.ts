import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PayrollLineDto } from './create-remuneration.dto';

export class PreviewSettlementDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollLineDto)
  lines?: PayrollLineDto[];

  @IsOptional()
  @IsBoolean()
  includeContractAllowances?: boolean;
}
