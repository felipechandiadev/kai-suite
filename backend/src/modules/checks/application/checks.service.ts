import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Check, CheckDirection, CheckStatus } from '../domain/check.entity';
import {
  CheckTransactionLink,
  CheckTransactionLinkRole,
} from '../domain/check-transaction-link.entity';
import { CheckEvent } from '../domain/check-event.entity';
import {
  CheckRepositoryPort,
  ListChecksFilter,
} from './ports/check.repository.port';
import {
  BounceCheckDto,
  ClearCheckDto,
  CreateCheckDto,
  DepositCheckDto,
  EndorseCheckDto,
  VoidCheckDto,
} from './dto/check.dtos';
import {
  PaymentMethod,
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { CheckLedgerService } from './check-ledger.service';
import { CheckBankCartolaService } from './check-bank-cartola.service';
import { CheckPaymentObligationService } from './check-payment-obligation.service';

const TODAY = () => new Date().toISOString().slice(0, 10);

const OUTGOING_TRANSACTION_TYPES = new Set<TransactionType>([
  TransactionType.SUPPLIER_PAYMENT,
  TransactionType.PAYROLL_PAYMENT,
  TransactionType.EXPENSE_PAYMENT,
  TransactionType.OPERATING_EXPENSE,
  TransactionType.PAYMENT_EXECUTION,
  TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER,
]);

@Injectable()
export class ChecksService {
  private readonly logger = new Logger(ChecksService.name);

  constructor(
    @Inject('CheckRepositoryPort')
    private readonly checks: CheckRepositoryPort,
    @InjectRepository(CheckTransactionLink)
    private readonly links: Repository<CheckTransactionLink>,
    @InjectRepository(CheckEvent)
    private readonly events: Repository<CheckEvent>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly checkLedger: CheckLedgerService,
    private readonly checkCartola: CheckBankCartolaService,
    private readonly checkPayments: CheckPaymentObligationService,
  ) {}

  async list(filter: ListChecksFilter) {
    return this.checks.list(filter);
  }

  async getById(id: string, companyId: string): Promise<Check> {
    const check = await this.checks.findById(id, companyId);
    if (!check) throw new NotFoundException('Cheque no encontrado');
    return check;
  }

  async getDetail(
    id: string,
    companyId: string,
  ): Promise<{
    check: Check;
    events: CheckEvent[];
    links: CheckTransactionLink[];
  }> {
    const check = await this.getById(id, companyId);
    const [events, links] = await Promise.all([
      this.events.find({
        where: { checkId: check.id },
        order: { at: 'ASC' },
      }),
      this.links.find({
        where: { checkId: check.id },
        order: { createdAt: 'ASC' },
      }),
    ]);
    return { check, events, links };
  }

  /**
   * Crea un cheque manualmente. La vía habitual es la creación
   * automática vía listener al confirmar una transacción.
   */
  async createManual(
    companyId: string,
    userId: string | null,
    data: CreateCheckDto,
  ): Promise<Check> {
    const check = new Check();
    check.companyId = companyId;
    check.direction = data.direction;
    check.status = CheckStatus.PENDING;
    check.checkNumber = data.checkNumber.trim();
    check.bankName = data.bankName.trim();
    check.bankAccountKey = data.bankAccountKey?.trim() || null;
    check.drawerName = data.drawerName?.trim() || null;
    check.drawerDocument = data.drawerDocument?.trim() || null;
    check.payeeName = data.payeeName?.trim() || null;
    check.payeeId = data.payeeId ?? null;
    check.amount = Number(data.amount);
    check.currency = (data.currency || 'CLP').trim().toUpperCase();
    check.issueDate = data.issueDate;
    check.dueDate = data.dueDate ?? null;
    check.transactionId = data.transactionId ?? null;

    const saved = await this.checks.save(check);

    if (saved.transactionId) {
      await this.linkTransaction(
        saved,
        saved.transactionId,
        CheckTransactionLinkRole.ORIGIN,
      );
    }
    await this.recordEvent(saved, null, CheckStatus.PENDING, userId, 'manual');
    return saved;
  }

  async deposit(
    id: string,
    companyId: string,
    userId: string | null,
    body: DepositCheckDto,
  ): Promise<Check> {
    const check = await this.getById(id, companyId);
    if (check.status !== CheckStatus.PENDING) {
      throw new BadRequestException(
        `Solo se puede depositar un cheque en estado PENDING (actual: ${check.status})`,
      );
    }
    if (check.direction !== CheckDirection.INCOMING) {
      throw new BadRequestException(
        'Solo cheques recibidos (INCOMING) se depositan',
      );
    }
    const next = await this.checks.update(id, {
      status: CheckStatus.DEPOSITED,
      depositDate: body.depositDate || TODAY(),
    });
    await this.recordEvent(
      next,
      CheckStatus.PENDING,
      CheckStatus.DEPOSITED,
      userId,
      body.notes,
    );
    return next;
  }

  async clear(
    id: string,
    companyId: string,
    userId: string | null,
    body: ClearCheckDto,
  ): Promise<Check> {
    const check = await this.getById(id, companyId);
    const allowed =
      check.direction === CheckDirection.INCOMING
        ? check.status === CheckStatus.DEPOSITED
        : check.status === CheckStatus.PENDING;
    if (!allowed) {
      throw new BadRequestException(
        `Transición a CLEARED no permitida desde ${check.status} (${check.direction})`,
      );
    }
    const next = await this.checks.update(id, {
      status: CheckStatus.CLEARED,
      clearedDate: body.clearedDate || TODAY(),
    });
    await this.recordEvent(
      next,
      check.status,
      CheckStatus.CLEARED,
      userId,
      body.notes,
    );
    await this.afterOutgoingStatusChange(next, check.status, CheckStatus.CLEARED);
    try {
      await this.checkCartola.postCleared(next);
    } catch (err) {
      this.logger.error(
        `Cartola post failed for check ${next.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return next;
  }

  async bounce(
    id: string,
    companyId: string,
    userId: string | null,
    body: BounceCheckDto,
  ): Promise<Check> {
    const check = await this.getById(id, companyId);
    if (
      check.status !== CheckStatus.DEPOSITED &&
      check.status !== CheckStatus.PENDING
    ) {
      throw new BadRequestException(
        `Solo se puede protestar un cheque en estado PENDING o DEPOSITED (actual: ${check.status})`,
      );
    }
    const next = await this.checks.update(id, {
      status: CheckStatus.BOUNCED,
      bouncedReason: body.reason.trim(),
    });
    await this.recordEvent(
      next,
      check.status,
      CheckStatus.BOUNCED,
      userId,
      body.notes,
    );
    await this.afterOutgoingStatusChange(next, check.status, CheckStatus.BOUNCED);
    return next;
  }

  async void(
    id: string,
    companyId: string,
    userId: string | null,
    body: VoidCheckDto,
  ): Promise<Check> {
    const check = await this.getById(id, companyId);
    if (
      check.status === CheckStatus.VOIDED ||
      check.status === CheckStatus.CLEARED ||
      check.status === CheckStatus.ENDORSED
    ) {
      throw new BadRequestException(
        `No se puede anular un cheque en estado ${check.status}`,
      );
    }
    const next = await this.checks.update(id, { status: CheckStatus.VOIDED });
    await this.recordEvent(
      next,
      check.status,
      CheckStatus.VOIDED,
      userId,
      body.notes,
    );
    await this.afterOutgoingStatusChange(next, check.status, CheckStatus.VOIDED);
    return next;
  }

  /**
   * Endoso de cheque INCOMING como pago saliente.
   * Requiere que `targetTransactionId` sea una transacción de pago de la
   * misma empresa y con `paymentMethod = CHECK`.
   */
  async endorse(
    id: string,
    companyId: string,
    userId: string | null,
    body: EndorseCheckDto,
  ): Promise<Check> {
    const check = await this.getById(id, companyId);
    if (check.direction !== CheckDirection.INCOMING) {
      throw new BadRequestException(
        'Solo cheques INCOMING pueden endosarse',
      );
    }
    if (check.status !== CheckStatus.PENDING) {
      throw new BadRequestException(
        `Solo se puede endosar un cheque en PENDING (actual: ${check.status})`,
      );
    }
    const target = await this.transactions.findOne({
      where: { id: body.targetTransactionId },
    });
    if (!target) {
      throw new NotFoundException(
        'Transacción destino no encontrada',
      );
    }
    if (target.companyId !== companyId) {
      throw new BadRequestException(
        'La transacción destino pertenece a otra empresa',
      );
    }
    if (!OUTGOING_TRANSACTION_TYPES.has(target.transactionType)) {
      throw new BadRequestException(
        'La transacción destino debe ser un pago saliente',
      );
    }
    if (target.paymentMethod !== PaymentMethod.CHECK) {
      throw new BadRequestException(
        'La transacción destino debe estar marcada con paymentMethod = CHECK',
      );
    }

    const next = await this.checks.update(id, { status: CheckStatus.ENDORSED });
    await this.linkTransaction(
      next,
      target.id,
      CheckTransactionLinkRole.ENDORSED_TO,
    );
    await this.recordEvent(
      next,
      check.status,
      CheckStatus.ENDORSED,
      userId,
      body.notes,
      { targetTransactionId: target.id },
    );
    return next;
  }

  /**
   * Helper público: crea un cheque desde un payment snapshot, evitando
   * duplicar si ya existe uno linkeado a la misma transacción y número.
   * Usado por el listener de TransactionCreatedEvent.
   */
  async createFromTransactionPayment(params: {
    companyId: string;
    transactionId: string;
    direction: CheckDirection;
    checkNumber: string;
    bankName: string;
    bankAccountKey?: string | null;
    drawerName?: string | null;
    drawerDocument?: string | null;
    payeeName?: string | null;
    payeeId?: string | null;
    amount: number;
    currency: string;
    issueDate?: string | null;
    dueDate?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<Check> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Check);
      const linkRepo = manager.getRepository(CheckTransactionLink);
      const eventRepo = manager.getRepository(CheckEvent);

      const existing = await repo.findOne({
        where: {
          companyId: params.companyId,
          transactionId: params.transactionId,
          checkNumber: params.checkNumber,
          bankName: params.bankName,
        },
      });
      if (existing) return existing;

      const check = repo.create({
        companyId: params.companyId,
        direction: params.direction,
        status: CheckStatus.PENDING,
        checkNumber: params.checkNumber,
        bankName: params.bankName,
        bankAccountKey: params.bankAccountKey ?? null,
        drawerName: params.drawerName ?? null,
        drawerDocument: params.drawerDocument ?? null,
        payeeName: params.payeeName ?? null,
        payeeId: params.payeeId ?? null,
        amount: params.amount,
        currency: (params.currency || 'CLP').toUpperCase(),
        issueDate: params.issueDate || TODAY(),
        dueDate: params.dueDate ?? null,
        transactionId: params.transactionId,
        metadata: params.metadata ?? null,
      });
      const saved = await repo.save(check);

      await linkRepo.save(
        linkRepo.create({
          companyId: params.companyId,
          checkId: saved.id,
          transactionId: params.transactionId,
          role: CheckTransactionLinkRole.ORIGIN,
        }),
      );
      await eventRepo.save(
        eventRepo.create({
          companyId: params.companyId,
          checkId: saved.id,
          fromStatus: null,
          toStatus: CheckStatus.PENDING,
          userId: null,
          notes: 'auto-created from transaction',
        }),
      );
      return saved;
    });
  }

  private async linkTransaction(
    check: Check,
    transactionId: string,
    role: CheckTransactionLinkRole,
  ): Promise<void> {
    const exists = await this.links.findOne({
      where: { checkId: check.id, transactionId, role },
    });
    if (exists) return;
    await this.links.save(
      this.links.create({
        companyId: check.companyId,
        checkId: check.id,
        transactionId,
        role,
      }),
    );
  }

  async getCommittedOutgoingSummary(companyId: string): Promise<{
    totalAmount: number;
    checkCount: number;
    byDueDate: Array<{ dueDate: string | null; amount: number; count: number }>;
    stalePendingCount: number;
  }> {
    return this.checks.getCommittedOutgoingSummary(companyId);
  }

  private async afterOutgoingStatusChange(
    check: Check,
    fromStatus: CheckStatus,
    toStatus: CheckStatus,
  ): Promise<void> {
    if (check.direction !== CheckDirection.OUTGOING) {
      return;
    }
    try {
      if (toStatus === CheckStatus.CLEARED) {
        await this.checkLedger.postOutgoingCleared(check);
      }
      if (
        toStatus === CheckStatus.BOUNCED ||
        toStatus === CheckStatus.VOIDED
      ) {
        if (fromStatus === CheckStatus.CLEARED) {
          await this.checkCartola.reverseCleared(check);
        }
        await this.checkLedger.reverseOutgoingCheck(check, fromStatus);
        await this.checkPayments.reopenLinkedPayment(check, toStatus);
      }
    } catch (err) {
      this.logger.error(
        `Post-status hooks failed for check ${check.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async recordEvent(
    check: Check,
    from: CheckStatus | null,
    to: CheckStatus,
    userId: string | null,
    notes?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    await this.events.save(
      this.events.create({
        companyId: check.companyId,
        checkId: check.id,
        fromStatus: from,
        toStatus: to,
        userId: userId ?? null,
        notes: notes?.trim() || null,
        metadata: metadata ?? null,
      }),
    );
  }
}
