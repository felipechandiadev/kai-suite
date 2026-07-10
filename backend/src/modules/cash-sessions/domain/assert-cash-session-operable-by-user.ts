import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CashSessionStatus } from './cash-session.entity';

export type CashSessionOperableInput = {
  id: string;
  status: CashSessionStatus | string;
  openedById?: string | null;
  pointOfSaleId?: string | null;
};

export type CashSessionOperableParams = {
  userId: string;
  pointOfSaleId: string;
};

/**
 * Valida que la sesión de caja esté OPEN, pertenezca al POS indicado
 * y que el usuario autenticado sea quien la abrió.
 */
export function assertCashSessionOperableByUser(
  session: CashSessionOperableInput | null | undefined,
  params: CashSessionOperableParams,
): asserts session is CashSessionOperableInput {
  if (!session) {
    throw new NotFoundException('Sesión de caja no encontrada');
  }

  if (session.status !== CashSessionStatus.OPEN) {
    throw new ConflictException(
      `La sesión de caja está en estado ${session.status}, no se pueden registrar operaciones`,
    );
  }

  if (session.pointOfSaleId !== params.pointOfSaleId) {
    throw new BadRequestException(
      'La sesión de caja no pertenece al punto de venta especificado',
    );
  }

  if (!session.openedById || session.openedById !== params.userId) {
    throw new ForbiddenException(
      'Esta sesión de caja fue abierta por otro usuario. Selecciona tu punto de venta en la configuración de sesión.',
    );
  }
}
