import { IsString, IsUUID } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

/**
 * Devolución de venta desde POS (modo documento / sin reembolso inmediato en caja).
 */
export class CreateSaleReturnDto extends CreateSaleDto {
  @IsString()
  @IsUUID()
  originalSaleId: string;
}

export class ConfirmCustomerReturnDocumentDto extends CreateSaleReturnDto {}

/** Mismo cuerpo que documento, pero con `payments` y montos de reembolso. */
export class ConfirmCustomerReturnRefundDto extends CreateSaleReturnDto {}
