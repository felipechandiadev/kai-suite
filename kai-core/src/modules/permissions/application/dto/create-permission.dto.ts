import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  ability: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
