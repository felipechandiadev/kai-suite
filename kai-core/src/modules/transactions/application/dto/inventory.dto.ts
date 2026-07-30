import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../domain/transaction.entity';

export class InventoryCountLineDto {
  @ApiProperty({
    description: 'Product ID to count',
    example: 'uuid-1234-5678',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Variant ID (optional)',
    example: 'uuid-variant-123',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({
    description: 'Storage location ID',
    example: 'uuid-storage-456',
  })
  @IsUUID()
  @IsNotEmpty()
  storageId: string;

  @ApiProperty({
    description: 'Physical count quantity',
    example: 150,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  physicalCount: number;

  @ApiPropertyOptional({
    description: 'System expected quantity',
    example: 145,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedQuantity?: number;

  @ApiPropertyOptional({
    description: 'Notes about the count',
    example: 'Counted by Juan Perez',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInventoryCountDto {
  @ApiProperty({
    description: 'Branch ID where count is performed',
    example: 'uuid-branch-789',
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    description: 'Storage ID being counted',
    example: 'uuid-storage-456',
  })
  @IsUUID()
  @IsNotEmpty()
  storageId: string;

  @ApiProperty({
    description: 'Count lines with product quantities',
    type: [InventoryCountLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineDto)
  lines: InventoryCountLineDto[];

  @ApiPropertyOptional({
    description: 'Count reference or batch number',
    example: 'COUNT-2024-001',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Monthly inventory count',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInventoryReservationDto {
  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid-branch-789',
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    description: 'Storage ID',
    example: 'uuid-storage-456',
  })
  @IsUUID()
  @IsNotEmpty()
  storageId: string;

  @ApiProperty({
    description: 'Customer ID for reservation',
    example: 'uuid-customer-123',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Product ID to reserve',
    example: 'uuid-product-456',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Variant ID',
    example: 'uuid-variant-789',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({
    description: 'Quantity to reserve',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reservation expiration date (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Order reference',
    example: 'ORDER-2024-001',
  })
  @IsOptional()
  @IsString()
  orderReference?: string;

  @ApiPropertyOptional({
    description: 'Reservation notes',
    example: 'Reserved for urgent customer order',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Related transaction ID (e.g. BACKORDER)',
    example: 'uuid-backorder-123',
  })
  @IsOptional()
  @IsUUID()
  relatedTransactionId?: string;
}

export class CreateInventoryReservationLineDto {
  @ApiProperty({ description: 'Product ID to reserve', example: 'uuid-product-456' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID', example: 'uuid-variant-789' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: 'Quantity to reserve', example: 5, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateInventoryReservationsDto {
  @ApiProperty({ description: 'Branch ID', example: 'uuid-branch-789' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'Storage ID', example: 'uuid-storage-456' })
  @IsUUID()
  @IsNotEmpty()
  storageId: string;

  @ApiProperty({ description: 'Customer ID for reservation', example: 'uuid-customer-123' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Reservation lines', type: [CreateInventoryReservationLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryReservationLineDto)
  lines: CreateInventoryReservationLineDto[];

  @ApiPropertyOptional({ description: 'Reservation expiration date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Order reference', example: 'ORDER-2024-001' })
  @IsOptional()
  @IsString()
  orderReference?: string;

  @ApiPropertyOptional({ description: 'Reservation notes', example: 'Reserved for urgent customer order' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Related transaction ID (e.g. BACKORDER)',
    example: 'uuid-backorder-123',
  })
  @IsOptional()
  @IsUUID()
  relatedTransactionId?: string;
}

export class CreateInventoryBlockDto {
  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid-branch-789',
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    description: 'Storage ID',
    example: 'uuid-storage-456',
  })
  @IsUUID()
  @IsNotEmpty()
  storageId: string;

  @ApiProperty({
    description: 'Product ID to block',
    example: 'uuid-product-456',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Variant ID',
    example: 'uuid-variant-789',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({
    description: 'Quantity to block',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Block reason',
    enum: [
      'QUALITY_CONTROL',
      'CALIBRATION',
      'DAMAGED',
      'EXPIRED',
      'RECALL',
      'OTHER',
    ],
    example: 'QUALITY_CONTROL',
  })
  @IsEnum([
    'QUALITY_CONTROL',
    'CALIBRATION',
    'DAMAGED',
    'EXPIRED',
    'RECALL',
    'OTHER',
  ])
  @IsNotEmpty()
  reason:
    | 'QUALITY_CONTROL'
    | 'CALIBRATION'
    | 'DAMAGED'
    | 'EXPIRED'
    | 'RECALL'
    | 'OTHER';

  @ApiPropertyOptional({
    description: 'Detailed reason description',
    example: 'Failed quality inspection due to packaging damage',
  })
  @IsOptional()
  @IsString()
  reasonDetails?: string;

  @ApiPropertyOptional({
    description: 'Expected unblock date (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  expectedUnblockDate?: string;

  @ApiPropertyOptional({
    description: 'Responsible user ID',
    example: 'uuid-user-123',
  })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;
}

export class CreateInventoryUnblockDto {
  @ApiProperty({
    description: 'Block transaction ID to unblock',
    example: 'uuid-block-transaction-123',
  })
  @IsUUID()
  @IsNotEmpty()
  blockTransactionId: string;

  @ApiProperty({
    description: 'Quantity to unblock (partial unblock allowed)',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Unblock reason',
    enum: [
      'QUALITY_PASSED',
      'CALIBRATION_COMPLETE',
      'REPAIRED',
      'REPLACED',
      'OTHER',
    ],
    example: 'QUALITY_PASSED',
  })
  @IsEnum([
    'QUALITY_PASSED',
    'CALIBRATION_COMPLETE',
    'REPAIRED',
    'REPLACED',
    'OTHER',
  ])
  @IsNotEmpty()
  reason:
    | 'QUALITY_PASSED'
    | 'CALIBRATION_COMPLETE'
    | 'REPAIRED'
    | 'REPLACED'
    | 'OTHER';

  @ApiPropertyOptional({
    description: 'Detailed unblock reason',
    example: 'Quality inspection passed after repair',
  })
  @IsOptional()
  @IsString()
  reasonDetails?: string;

  @ApiPropertyOptional({
    description: 'Responsible user ID',
    example: 'uuid-user-123',
  })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;
}
