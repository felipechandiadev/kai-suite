import {
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export type GeoPoint = { lat: number; lng: number };

export class StorageDto {
  id: string;
  branchId?: string;
  name: string;
  code?: string;
  type: StorageType;
  category: StorageCategory;
  capacity?: number;
  address?: string | null;
  location?: GeoPoint | null;
  isDefault: boolean;
  isActive: boolean;
  productionUnitId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  // Relations
  branch?: {
    id: string;
    name: string;
  };
}

export class CreateStorageDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType = StorageType.WAREHOUSE;

  @IsOptional()
  @IsEnum(StorageCategory)
  category?: StorageCategory = StorageCategory.IN_BRANCH;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  location?: GeoPoint;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsUUID('4', { each: true })
  laborUnitIds?: string[];
}

export class UpdateStorageDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;

  @IsOptional()
  @IsEnum(StorageCategory)
  category?: StorageCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  location?: GeoPoint;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID('4', { each: true })
  laborUnitIds?: string[];
}
