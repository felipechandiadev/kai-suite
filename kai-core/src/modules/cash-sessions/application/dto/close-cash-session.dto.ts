import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/** Conteo físico por medio (cierre ciego / arqueo). Suma = total declarado en caja. */
export class CloseCashSessionCountedDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cash?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debitCard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditCard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transfer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  check?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  other?: number;
}

class CloseCashSessionUserDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class CloseCashSessionDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  closedById?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CloseCashSessionUserDto)
  user?: CloseCashSessionUserDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCash?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Opcional: centro de acopio destino (debe estar vinculado al POS o ser default del POS). */
  @IsOptional()
  @IsUUID()
  cashHubId?: string;

  /**
   * Conteo ciego por medio de pago. Si viene, el cierre usa la suma como `closingAmount`
   * y calcula diferencia vs. efectivo teórico de sesión (`recompute`).
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => CloseCashSessionCountedDto)
  counted?: CloseCashSessionCountedDto;

  /**
   * Cierre desde kai-admin: permite cerrar aunque el usuario no haya abierto la sesión.
   * Requiere rol de gobernanza (ADMIN / SUB_ADMIN / SUPER_ADMIN). Sin arqueo ciego.
   */
  @IsOptional()
  @IsBoolean()
  adminClose?: boolean;
}