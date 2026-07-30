import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

export class SearchTransactionsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page size (alias for limit)',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number; // Alias para limit

  @ApiPropertyOptional({
    description: 'Additional filters (JSON string)',
    example: '{"branchId": "uuid-1234"}',
  })
  @IsOptional()
  filters?: any; // Acepta cualquier cosa - se ignora

  @ApiPropertyOptional({
    description: 'Transaction type filter',
    enum: TransactionType,
    example: 'SALE',
  })
  @IsOptional()
  @IsString()
  type?: TransactionType;

  @ApiPropertyOptional({
    description:
      'Lista de tipos separados por coma (ej. SALE,SALE_RETURN). Si se envía, filtra con IN y tiene prioridad sobre `type`.',
    example: 'SALE,SALE_RETURN',
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({
    description: 'Transaction status filter',
    enum: TransactionStatus,
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsString()
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Payment method filter',
    enum: PaymentMethod,
    example: 'CASH',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Branch ID filter',
    example: 'uuid-1234',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Point of sale ID filter',
    example: 'uuid-5678',
  })
  @IsOptional()
  @IsString()
  pointOfSaleId?: string;

  @ApiPropertyOptional({
    description: 'Customer ID filter',
    example: 'uuid-9012',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Supplier ID filter',
    example: 'uuid-3456',
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Clave de cuenta bancaria de la empresa (movimientos en esa cuenta)',
    example: 'main-checking',
  })
  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @ApiPropertyOptional({
    description: 'Centro de acopio (transacciones con cashHubId)',
  })
  @IsOptional()
  @IsString()
  cashHubId?: string;
}
