import { IsOptional, IsUUID } from 'class-validator';

export class ListProductVariantsDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}