import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class OpenCashSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'userId es obligatorio' })
  userId: string;

  @IsString()
  @IsOptional()
  userName?: string;

  @IsString()
  @IsNotEmpty({ message: 'pointOfSaleId es obligatorio' })
  pointOfSaleId: string;

  @IsNumber()
  @Min(0, { message: 'El monto de apertura no puede ser negativo' })
  openingAmount: number = 0;

  @IsOptional()
  @IsString()
  cashHubId?: string;
}
