import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateDiningNumberingSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  /** HH:mm:ss */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'resetTimeLocal debe ser HH:mm:ss',
  })
  resetTimeLocal?: string;

  @IsOptional()
  @IsBoolean()
  allowWaiterOpenTable?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPosOpenTable?: boolean;

  /** Vacío = todas las categorías en el menú de accounts. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  posAccountsMenuCategoryIds?: string[];
}
