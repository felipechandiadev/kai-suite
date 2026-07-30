import { ChecksReconciliationService } from '@modules/checks/application/checks-reconciliation.service';
import {
  Check,
  CheckDirection,
  CheckStatus,
} from '@modules/checks/domain/check.entity';

describe('ChecksReconciliationService', () => {
  let service: ChecksReconciliationService;
  let checks: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let events: { create: jest.Mock; save: jest.Mock };
  let movements: { findOne: jest.Mock };
  let checksService: { clear: jest.Mock };

  const COMPANY_ID = 'company-1';

  const incomingPending = (): Check =>
    ({
      id: 'chk-1',
      companyId: COMPANY_ID,
      direction: CheckDirection.INCOMING,
      status: CheckStatus.DEPOSITED,
      checkNumber: '1001',
      bankName: 'BCI',
      amount: 50000,
      currency: 'CLP',
      issueDate: '2026-05-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Check;

  beforeEach(() => {
    checks = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (c) => c),
    };
    events = {
      create: jest.fn().mockImplementation((x) => x),
      save: jest.fn().mockResolvedValue({}),
    };
    movements = { findOne: jest.fn() };
    checksService = {
      clear: jest.fn().mockImplementation(async (id: string) => {
        const base = incomingPending();
        return { ...base, id, status: CheckStatus.CLEARED };
      }),
    };
    service = new ChecksReconciliationService(
      checks as any,
      events as any,
      movements as any,
      checksService as any,
    );
  });

  describe('tryMatch', () => {
    it('returns no-candidates when zero matches', async () => {
      checks.find.mockResolvedValueOnce([]);
      const r = await service.tryMatch({
        id: 'mov-1',
        companyId: COMPANY_ID,
        direction: 'IN',
        amount: 50000,
      } as any);
      expect(r).toEqual({
        matched: false,
        check: null,
        reason: 'no-candidates',
      });
    });

    it('matches uniquely and transitions to CLEARED', async () => {
      const candidate = incomingPending();
      checks.find.mockResolvedValueOnce([candidate]);
      const r = await service.tryMatch({
        id: 'mov-1',
        companyId: COMPANY_ID,
        direction: 'IN',
        amount: 50000,
      } as any);
      expect(r.matched).toBe(true);
      expect(r.check?.status).toBe(CheckStatus.CLEARED);
      expect(checksService.clear).toHaveBeenCalled();
    });

    it('returns multiple-candidates when amount matches more than one and no description narrows it', async () => {
      const c1 = { ...incomingPending(), id: 'chk-1' } as Check;
      const c2 = { ...incomingPending(), id: 'chk-2', checkNumber: '1002' } as Check;
      checks.find.mockResolvedValueOnce([c1, c2]);
      const r = await service.tryMatch({
        id: 'mov-1',
        companyId: COMPANY_ID,
        direction: 'IN',
        amount: 50000,
      } as any);
      expect(r.matched).toBe(false);
      expect(r.reason).toBe('multiple-candidates');
    });

    it('narrows by checkNumber when present in movement description', async () => {
      const c1 = { ...incomingPending(), id: 'chk-1', checkNumber: '1001' } as Check;
      const c2 = { ...incomingPending(), id: 'chk-2', checkNumber: '1002' } as Check;
      checks.find.mockResolvedValueOnce([c1, c2]);
      const r = await service.tryMatch({
        id: 'mov-1',
        companyId: COMPANY_ID,
        direction: 'IN',
        amount: 50000,
        description: 'Cheque 1002 pagado',
      } as any);
      expect(r.matched).toBe(true);
      expect(r.check?.id).toBe('chk-2');
    });

    it('uses DEPOSITED statuses for IN direction and PENDING for OUT', async () => {
      checks.find.mockResolvedValueOnce([]);
      await service.tryMatch({
        id: 'mov-1',
        companyId: COMPANY_ID,
        direction: 'OUT',
        amount: 1000,
      } as any);
      const args = checks.find.mock.calls[0][0];
      expect(args.where.direction).toBe(CheckDirection.OUTGOING);
    });
  });
});
