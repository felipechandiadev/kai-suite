import { IsUUID } from 'class-validator';

export class CtpByStorageQueryDto {
  @IsUUID()
  variantId!: string;
}
