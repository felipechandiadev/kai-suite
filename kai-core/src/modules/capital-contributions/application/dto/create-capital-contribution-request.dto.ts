import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCapitalContributionRequestDto {
  @IsUUID()
  shareholderId!: string;

  @ValidateIf((o: CreateCapitalContributionRequestDto) => !o.cashHubId?.trim())
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  @IsUUID()
  cashHubId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  occurredOn?: string;
}