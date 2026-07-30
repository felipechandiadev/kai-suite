import { IsOptional, IsString } from 'class-validator';

export class CancelBackorderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
