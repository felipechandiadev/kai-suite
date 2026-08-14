import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePrintAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
