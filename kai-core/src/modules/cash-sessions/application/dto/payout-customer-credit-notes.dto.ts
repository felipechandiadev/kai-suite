import {
  IsArray,
  IsString,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentDetailDto } from './create-sale.dto';

/** Liquidación de saldo NC: devuelve el 100 % del disponible de cada nota seleccionada. */
export class PayoutCustomerCreditNotesDto {
  @IsString()
  userName: string;

  @IsString()
  pointOfSaleId: string;

  @IsString()
  cashSessionId: string;

  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  creditNoteTransactionIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  payments: PaymentDetailDto[];
}
