import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LookupPersonByDocumentDto {
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  documentNumber!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(32)
  documentType?: string;

  /** Al editar, excluir la persona actual del conflicto. */
  @IsOptional()
  @IsString()
  excludePersonId?: string;
}
