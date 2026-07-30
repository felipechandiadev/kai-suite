import { IsUUID } from 'class-validator';

export class CtpDetailQueryDto {
  @IsUUID()
  variantId!: string;

  @IsUUID()
  branchId!: string;
}
