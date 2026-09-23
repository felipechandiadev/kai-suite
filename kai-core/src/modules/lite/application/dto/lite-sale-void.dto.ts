import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LiteSaleVoidDto {
  @ApiPropertyOptional({ example: 'Error de cobro' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
