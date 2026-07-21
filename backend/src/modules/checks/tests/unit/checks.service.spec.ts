import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChecksService } from '@modules/checks/application/checks.service';
import {
  Check,
  CheckDirection,
  CheckStatus,
} from '@modules/checks/domain/check.entity';
import {
  CheckTransactionLink,
  CheckTransactionLinkRole,
} from '@modules/checks/domain/check-transaction-link.entity';
import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('ChecksService', () => {
  let service: ChecksService;
  let checkRepo: {
    save: jest.Mock;
    findById: jest.Mock;
    list: jest.Mock;
    update: jest.Mock;
    getCommittedOutgoingSummary: jest.Mock;
  };
  let linkRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let eventRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let transactionsRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let checkLedger: { postOutgoingCleared: jest.Mock; reverseOutgoingCheck: jest.Mock };
  let checkCartola: { postCleared: jest.Mock; reverseCleared: jest.Mock };
  let checkPayments: { reopenLinkedPayment: jest.Mock };

  const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

  const baseCheck = (overrides: Partial<Check> = {}): Check =>
    ({
      id: '00000000-0000-0000-0000-0000000000aa',
      companyId: COMPANY_ID,
      direction: CheckDirection.INCOMING,
      status: CheckStatus.PENDING,
      checkNumber: '1001',
      bankName: 'BCI',
      amount: 100000,
      currency: 'CLP',
      issueDate: '2026-05-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Check;

  beforeEach(() => {
    checkRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      getCommittedOutgoingSummary: jest.fn(),
    };
    checkLedger = {
      postOutgoingCleared: jest.fn().mockResolvedValue(undefined),
      reverseOutgoingCheck: jest.fn().mockResolvedValue(undefined),
    };
    checkCartola = {
      postCleared: jest.fn().mockResolvedValue(undefined),
      reverseCleared: jest.fn().mockResolvedValue(undefined),
    };
    checkPayments = {
      reopenLinkedPayment: jest.fn().mockResolvedValue(undefined),
    };
    linkRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((x) => x),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };
    eventRepo = {
      create: jest.fn().mockImplementation((x) => x),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };
    transactionsRepo = { findOne: jest.fn() };
    dataSource = {
      transaction: jest.fn(async (fn) => fn({})),
    };
    service = new ChecksService(
      checkRepo as any,
      linkRepo as any,
      eventRepo as any,
      transactionsRepo as any,
      dataSource as any,
      checkLedger as any,
      checkCartola as any,
      checkPayments as any,
    );
  });

  describe('getById', () => {
    it('throws NotFoundException when missing', async () => {
      checkRepo.findById.mockResolvedValueOnce(null);
      await expect(service.getById('x', COMPANY_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('rejects deposit on non-PENDING check', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ status: CheckStatus.DEPOSITED }),
      );
      await expect(
        service.deposit('id', COMPANY_ID, null, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects deposit on OUTGOING check', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ direction: CheckDirection.OUTGOING }),
      );
      await expect(
        service.deposit('id', COMPANY_ID, null, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions PENDING -> DEPOSITED for INCOMING and records event', async () => {
      const original = baseCheck();
      checkRepo.findById.mockResolvedValueOnce(original);
      checkRepo.update.mockResolvedValueOnce({
        ...original,
        status: CheckStatus.DEPOSITED,
        depositDate: '2026-05-10',
      });
      const out = await service.deposit('id', COMPANY_ID, 'user-1', {
        depositDate: '2026-05-10',
      });
      expect(out.status).toBe(CheckStatus.DEPOSITED);
      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: CheckStatus.PENDING,
          toStatus: CheckStatus.DEPOSITED,
          userId: 'user-1',
        }),
      );
    });
  });

  describe('clear', () => {
    it('INCOMING from DEPOSITED transitions to CLEARED', async () => {
      const original = baseCheck({ status: CheckStatus.DEPOSITED });
      checkRepo.findById.mockResolvedValueOnce(original);
      checkRepo.update.mockResolvedValueOnce({
        ...original,
        status: CheckStatus.CLEARED,
      });
      const out = await service.clear('id', COMPANY_ID, null, {});
      expect(out.status).toBe(CheckStatus.CLEARED);
    });

    it('OUTGOING from PENDING transitions to CLEARED', async () => {
      const original = baseCheck({
        direction: CheckDirection.OUTGOING,
        status: CheckStatus.PENDING,
      });
      checkRepo.findById.mockResolvedValueOnce(original);
      checkRepo.update.mockResolvedValueOnce({
        ...original,
        status: CheckStatus.CLEARED,
      });
      const out = await service.clear('id', COMPANY_ID, null, {});
      expect(out.status).toBe(CheckStatus.CLEARED);
      expect(checkLedger.postOutgoingCleared).toHaveBeenCalled();
      expect(checkCartola.postCleared).toHaveBeenCalled();
    });

    it('INCOMING CLEARED also posts cartola movement', async () => {
      const original = baseCheck({ status: CheckStatus.DEPOSITED });
      checkRepo.findById.mockResolvedValueOnce(original);
      checkRepo.update.mockResolvedValueOnce({
        ...original,
        status: CheckStatus.CLEARED,
      });
      await service.clear('id', COMPANY_ID, null, {});
      expect(checkCartola.postCleared).toHaveBeenCalled();
      expect(checkLedger.postOutgoingCleared).not.toHaveBeenCalled();
    });

    it('rejects clear for INCOMING in PENDING', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ status: CheckStatus.PENDING }),
      );
      await expect(
        service.clear('id', COMPANY_ID, null, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('bounce', () => {
    it('rejects bounce on CLEARED', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ status: CheckStatus.CLEARED }),
      );
      await expect(
        service.bounce('id', COMPANY_ID, null, { reason: 'r' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('void', () => {
    it('rejects void on CLEARED/ENDORSED', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ status: CheckStatus.ENDORSED }),
      );
      await expect(
        service.void('id', COMPANY_ID, null, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('endorse', () => {
    const targetTxId = '00000000-0000-0000-0000-0000000000ff';

    it('rejects endorse on OUTGOING check', async () => {
      checkRepo.findById.mockResolvedValueOnce(
        baseCheck({ direction: CheckDirection.OUTGOING }),
      );
      await expect(
        service.endorse('id', COMPANY_ID, null, {
          targetTransactionId: targetTxId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when target tx not found', async () => {
      checkRepo.findById.mockResolvedValueOnce(baseCheck());
      transactionsRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.endorse('id', COMPANY_ID, null, {
          targetTransactionId: targetTxId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when target tx belongs to another company', async () => {
      checkRepo.findById.mockResolvedValueOnce(baseCheck());
      transactionsRepo.findOne.mockResolvedValueOnce({
        id: targetTxId,
        companyId: 'other-company',
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        paymentMethod: PaymentMethod.CHECK,
      });
      await expect(
        service.endorse('id', COMPANY_ID, null, {
          targetTransactionId: targetTxId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when target tx is not an outgoing payment type', async () => {
      checkRepo.findById.mockResolvedValueOnce(baseCheck());
      transactionsRepo.findOne.mockResolvedValueOnce({
        id: targetTxId,
        companyId: COMPANY_ID,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CHECK,
      });
      await expect(
        service.endorse('id', COMPANY_ID, null, {
          targetTransactionId: targetTxId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when target tx is not paymentMethod=CHECK', async () => {
      checkRepo.findById.mockResolvedValueOnce(baseCheck());
      transactionsRepo.findOne.mockResolvedValueOnce({
        id: targetTxId,
        companyId: COMPANY_ID,
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        paymentMethod: PaymentMethod.TRANSFER,
      });
      await expect(
        service.endorse('id', COMPANY_ID, null, {
          targetTransactionId: targetTxId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('endorses INCOMING/PENDING and creates ENDORSED_TO link', async () => {
      const original = baseCheck();
      checkRepo.findById.mockResolvedValueOnce(original);
      transactionsRepo.findOne.mockResolvedValueOnce({
        id: targetTxId,
        companyId: COMPANY_ID,
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        paymentMethod: PaymentMethod.CHECK,
      });
      checkRepo.update.mockResolvedValueOnce({
        ...original,
        status: CheckStatus.ENDORSED,
      });
      const out = await service.endorse('id', COMPANY_ID, 'user-1', {
        targetTransactionId: targetTxId,
      });
      expect(out.status).toBe(CheckStatus.ENDORSED);
      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          checkId: original.id,
          transactionId: targetTxId,
          role: CheckTransactionLinkRole.ENDORSED_TO,
        }) as Partial<CheckTransactionLink>,
      );
    });
  });
});
