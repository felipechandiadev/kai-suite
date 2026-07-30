import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddEShopCartItemDto {
  @IsUUID()
  productVariantId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class UpdateEShopCartItemDto {
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class LockEShopCartDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
