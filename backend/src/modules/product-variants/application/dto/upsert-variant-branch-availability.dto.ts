import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class VariantBranchAvailabilityItemDto {
  @IsUUID()
  branchId!: string;

  @IsBoolean()
  isActive!: boolean;
}

export class UpsertVariantBranchAvailabilityDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => VariantBranchAvailabilityItemDto)
  items!: VariantBranchAvailabilityItemDto[];
}
