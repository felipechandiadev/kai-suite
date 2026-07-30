import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CashSessionCoreService } from './cash-session-core.service';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CashHubsService } from '@modules/cash-hubs/application/cash-hubs.service';

describe('CashSessionCoreService', () => {
  let service: CashSessionCoreService;
  let cashSessionRepo: Partial<Repository<CashSession>>;
  let txService: Partial<TransactionsService>;

  beforeEach(async () => {
    cashSessionRepo = { findOne: jest.fn() };
    txService = { getMovementsForSession: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashSessionCoreService,
        { provide: getRepositoryToken(CashSession), useValue: cashSessionRepo },
        { provide: getRepositoryToken(PointOfSale), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: { find: jest.fn() } },
        { provide: DataSource, useValue: {} },
        { provide: TransactionsService, useValue: txService },
        { provide: CashHubsService, useValue: {} },
      ],
    }).compile();

    service = module.get<CashSessionCoreService>(CashSessionCoreService);
  });

  it('should include movements when finding one session', async () => {
    const fakeSession = { id: 's1', openedBy: null, closedBy: null } as any;
    (cashSessionRepo.findOne as jest.Mock).mockResolvedValue(fakeSession);
    (txService.getMovementsForSession as jest.Mock).mockResolvedValue([
      { id: 'm1' },
    ]);

    const result = await service.findOne('s1');
    expect(result.success).toBe(true);
    expect(result.movements).toEqual([{ id: 'm1' }]);
  });
});
