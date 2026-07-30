import { IsString, IsNumber, IsUUID, IsOptional } from 'class-validator';

export class OpeningTransactionDto {
  @IsUUID()
  cashSessionId: string;

  @IsNumber()
  openingAmount: number;

  @IsString()
  openedById: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
