import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CashSessionStatus } from '@modules/cash-sessions/domain/cash-session.entity';
import { assertCashSessionOperableByUser } from '@modules/cash-sessions/domain/assert-cash-session-operable-by-user';

const baseSession = {
  id: 'session-1',
  status: CashSessionStatus.OPEN,
  openedById: 'user-a',
  pointOfSaleId: 'pos-1',
};

describe('assertCashSessionOperableByUser', () => {
  it('permite operar cuando la sesión es del usuario y del POS', () => {
    expect(() =>
      assertCashSessionOperableByUser(baseSession, {
        userId: 'user-a',
        pointOfSaleId: 'pos-1',
      }),
    ).not.toThrow();
  });

  it('rechaza sesión inexistente', () => {
    expect(() =>
      assertCashSessionOperableByUser(null, {
        userId: 'user-a',
        pointOfSaleId: 'pos-1',
      }),
    ).toThrow(NotFoundException);
  });

  it('rechaza sesión cerrada', () => {
    expect(() =>
      assertCashSessionOperableByUser(
        { ...baseSession, status: CashSessionStatus.CLOSED },
        { userId: 'user-a', pointOfSaleId: 'pos-1' },
      ),
    ).toThrow(ConflictException);
  });

  it('rechaza otro usuario', () => {
    expect(() =>
      assertCashSessionOperableByUser(baseSession, {
        userId: 'user-b',
        pointOfSaleId: 'pos-1',
      }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza POS distinto', () => {
    expect(() =>
      assertCashSessionOperableByUser(baseSession, {
        userId: 'user-a',
        pointOfSaleId: 'pos-2',
      }),
    ).toThrow(BadRequestException);
  });
});
