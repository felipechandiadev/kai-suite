import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreatePrintAgentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
