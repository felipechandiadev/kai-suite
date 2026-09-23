import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import {
  CashSession,
  CashSessionStatus,
  type CashSessionTenderBreakdown,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { Person, PersonType } from '@modules/persons/domain/person.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import {
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import { AppConfigService } from '../../../config/config.service';
import {
  LiteCreateUserDto,
  type LiteUserRoleCode,
} from './dto/lite-create-user.dto';
import { LitePatchPosCurrentDto } from './dto/lite-pos-current.dto';

/** Medios configurables en Lite POS (caja simple, sin crédito/voucher/mixto). */
export const LITE_POS_PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
];

export const LITE_POS_PAYMENT_METHOD_DEFAULTS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
];

const LITE_POS_PAYMENT_SET = new Set<string>(LITE_POS_PAYMENT_METHOD_OPTIONS);

function normalizeLiteEnabledPaymentMethods(
  raw: unknown,
): PaymentMethod[] {
  const allowed = LITE_POS_PAYMENT_METHOD_OPTIONS;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...LITE_POS_PAYMENT_METHOD_DEFAULTS];
  }
  const seen = new Set<string>();
  const out: PaymentMethod[] = [];
  for (const item of raw) {
    const key = String(item ?? '')
      .trim()
      .toUpperCase();
    if (!LITE_POS_PAYMENT_SET.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key as PaymentMethod);
  }
  if (out.length === 0) {
    return [...LITE_POS_PAYMENT_METHOD_DEFAULTS];
  }
  // Preserve catalog order for stable UI.
  return allowed.filter((m) => out.includes(m));
}

@Injectable()
export class LiteOpsService {
  constructor(
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepo: Repository<CashSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCompanyMembership)
    private readonly membershipRepo: Repository<UserCompanyMembership>,
    @InjectRepository(UserCompanyRole)
    private readonly roleRepo: Repository<UserCompanyRole>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    private readonly config: AppConfigService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async listPointsOfSale(companyId: string) {
    const rows = await this.posRepo.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    return {
      items: rows.map((p) => this.mapPos(p)),
    };
  }

  async getCurrentPointOfSale(companyId: string) {
    const pos = await this.posRepo.findOne({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    if (!pos) {
      throw new NotFoundException('No hay punto de venta configurado');
    }
    return this.mapPos(pos);
  }

  async patchCurrentPointOfSale(
    companyId: string,
    dto: LitePatchPosCurrentDto,
  ) {
    const pos = await this.posRepo.findOne({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    if (!pos) {
      throw new NotFoundException('No hay punto de venta configurado');
    }

    if (dto.name != null) pos.name = dto.name.trim();
    if (dto.storageId !== undefined) {
      if (dto.storageId) {
        const storage = await this.storageRepo.findOne({
          where: { id: dto.storageId, companyId },
        });
        if (!storage) {
          throw new BadRequestException(
            `Almacén no encontrado: ${dto.storageId}`,
          );
        }
        pos.storageId = storage.id;
      } else {
        pos.storageId = null;
      }
    }
    if (dto.isActive != null) pos.isActive = dto.isActive;
    if (dto.enabledPaymentMethods !== undefined) {
      const enabled = normalizeLiteEnabledPaymentMethods(
        dto.enabledPaymentMethods,
      );
      if (enabled.length === 0) {
        throw new BadRequestException(
          'Debés habilitar al menos un medio de pago',
        );
      }
      const invalid = (dto.enabledPaymentMethods ?? []).filter((m) => {
        const key = String(m ?? '')
          .trim()
          .toUpperCase();
        return key.length > 0 && !LITE_POS_PAYMENT_SET.has(key);
      });
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Medios de pago no soportados en Lite: ${invalid.join(', ')}`,
        );
      }
      pos.settings = {
        ...(pos.settings ?? {}),
        enabledPaymentMethods: enabled,
      };
    }

    await this.posRepo.save(pos);
    return this.mapPos(pos);
  }

  private mapPos(p: PointOfSale) {
    return {
      id: p.id,
      name: p.name,
      branchId: p.branchId ?? null,
      storageId: p.storageId ?? null,
      isActive: p.isActive,
      enabledPaymentMethods: normalizeLiteEnabledPaymentMethods(
        (p.settings as { enabledPaymentMethods?: unknown } | null | undefined)
          ?.enabledPaymentMethods,
      ),
      availablePaymentMethods: [...LITE_POS_PAYMENT_METHOD_OPTIONS],
    };
  }

  async openCashSession(params: {
    companyId: string;
    pointOfSaleId: string;
    openingAmount: number;
    openedById: string;
  }) {
    const pos = await this.posRepo.findOne({
      where: { id: params.pointOfSaleId, companyId: params.companyId },
    });
    if (!pos) {
      throw new NotFoundException(
        `Punto de venta no encontrado: ${params.pointOfSaleId}`,
      );
    }

    const openExisting = await this.cashSessionRepo.findOne({
      where: {
        companyId: params.companyId,
        pointOfSaleId: params.pointOfSaleId,
        status: CashSessionStatus.OPEN,
      },
    });
    if (openExisting) {
      throw new BadRequestException(
        'Ya existe una sesión de caja abierta para este POS',
      );
    }

    const session = await this.cashSessionRepo.save(
      this.cashSessionRepo.create({
        companyId: params.companyId,
        pointOfSaleId: params.pointOfSaleId,
        openedById: params.openedById,
        status: CashSessionStatus.OPEN,
        openingAmount: params.openingAmount,
        expectedAmount: params.openingAmount,
        openedAt: new Date(),
      }),
    );

    return {
      id: session.id,
      status: session.status,
      pointOfSaleId: session.pointOfSaleId,
      openingAmount: Number(session.openingAmount ?? 0),
      openedAt: session.openedAt.toISOString(),
    };
  }

  async closeCashSession(params: {
    companyId: string;
    sessionId: string;
    closingAmount: number;
    closedById: string;
    countsByMethod?: Record<string, number>;
  }) {
    const session = await this.cashSessionRepo.findOne({
      where: { id: params.sessionId, companyId: params.companyId },
    });
    if (!session) {
      throw new NotFoundException(
        `Sesión de caja no encontrada: ${params.sessionId}`,
      );
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La sesión de caja no está abierta');
    }

    session.status = CashSessionStatus.CLOSED;
    session.closingAmount = params.closingAmount;
    session.closedById = params.closedById;
    session.closedAt = new Date();
    if (session.expectedAmount == null) {
      session.expectedAmount = Number(session.openingAmount ?? 0);
    }
    session.difference =
      Number(params.closingAmount) - Number(session.expectedAmount ?? 0);

    const counts = params.countsByMethod ?? {};
    const actual = tenderBreakdownFromCounts(counts, params.closingAmount);
    const expectedEmpty: CashSessionTenderBreakdown = {
      cash: Number(session.expectedAmount ?? 0),
      debitCard: 0,
      creditCard: 0,
      transfer: 0,
      check: 0,
      other: 0,
    };
    session.closingDetails = {
      countedByUserId: params.closedById,
      countedAt: session.closedAt.toISOString(),
      actual,
      expected: expectedEmpty,
      difference: {
        cash: Number(session.difference ?? 0),
        total:
          Object.values(actual).reduce((s, n) => s + Number(n || 0), 0) -
          Number(session.expectedAmount ?? 0),
      },
    };

    await this.cashSessionRepo.save(session);

    return {
      id: session.id,
      status: session.status,
      closingAmount: Number(session.closingAmount ?? 0),
      expectedAmount: Number(session.expectedAmount ?? 0),
      difference: Number(session.difference ?? 0),
      closedAt: session.closedAt!.toISOString(),
      countsByMethod: counts,
    };
  }

  /**
   * Ingreso de efectivo a la sesión abierta.
   * Lite: sin cash hub / tesorería — solo mueve el efectivo esperado de la caja.
   */
  async registerCashDeposit(params: {
    companyId: string;
    sessionId: string;
    amount: number;
    reason?: string;
    userId: string;
  }) {
    return this.registerCashMovement({
      ...params,
      kind: 'deposit',
    });
  }

  /**
   * Egreso de efectivo de la sesión abierta.
   * Lite: sin cash hub / tesorería.
   */
  async registerCashWithdrawal(params: {
    companyId: string;
    sessionId: string;
    amount: number;
    reason?: string;
    userId: string;
  }) {
    return this.registerCashMovement({
      ...params,
      kind: 'withdrawal',
    });
  }

  private async registerCashMovement(params: {
    companyId: string;
    sessionId: string;
    amount: number;
    reason?: string;
    userId: string;
    kind: 'deposit' | 'withdrawal';
  }) {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const session = await this.cashSessionRepo.findOne({
      where: { id: params.sessionId, companyId: params.companyId },
    });
    if (!session) {
      throw new NotFoundException(
        `Sesión de caja no encontrada: ${params.sessionId}`,
      );
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La sesión de caja no está abierta');
    }

    const isDeposit = params.kind === 'deposit';
    const type = isDeposit
      ? TransactionType.CASH_SESSION_DEPOSIT
      : TransactionType.CASH_SESSION_WITHDRAWAL;

    if (!session.pointOfSaleId) {
      throw new BadRequestException(
        'La sesión de caja no tiene punto de venta asociado',
      );
    }
    const pos = await this.posRepo.findOne({
      where: { id: session.pointOfSaleId, companyId: params.companyId },
    });
    if (!pos?.branchId) {
      throw new BadRequestException(
        'No hay sucursal configurada para emitir folios de caja',
      );
    }

    const documentNumber = await this.documentNumbers.allocateNext(
      pos.branchId,
      type,
      params.companyId,
    );

    const tx = await this.transactionRepo.save(
      this.transactionRepo.create({
        companyId: params.companyId,
        documentNumber,
        transactionType: type,
        status: TransactionStatus.COMPLETED,
        branchId: pos.branchId,
        pointOfSaleId: session.pointOfSaleId ?? undefined,
        cashSessionId: session.id,
        userId: params.userId,
        subtotal: amount,
        taxAmount: 0,
        discountAmount: 0,
        total: amount,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: undefined,
        amountPaid: amount,
        completedAt: new Date(),
        metadata: {
          lite: true,
          kind: params.kind,
          reason: params.reason?.trim() || null,
          cashHubId: null,
        },
      }),
    );

    const base =
      session.expectedAmount != null
        ? Number(session.expectedAmount)
        : Number(session.openingAmount ?? 0);
    session.expectedAmount = isDeposit ? base + amount : base - amount;
    await this.cashSessionRepo.save(session);

    return {
      id: tx.id,
      documentNumber: tx.documentNumber,
      kind: params.kind,
      amount,
      expectedAmount: Number(session.expectedAmount),
      createdAt: tx.createdAt.toISOString(),
    };
  }

  async listCashSessions(companyId: string) {
    const rows = await this.cashSessionRepo.find({
      where: { companyId },
      order: { openedAt: 'DESC' },
    });
    const posIds = [
      ...new Set(
        rows
          .map((s) => s.pointOfSaleId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const posRows = posIds.length
      ? await this.posRepo.find({ where: { id: In(posIds) } })
      : [];
    const posById = new Map(posRows.map((p) => [p.id, p]));

    return {
      items: rows.map((s) => {
        const pos = s.pointOfSaleId
          ? posById.get(s.pointOfSaleId)
          : undefined;
        return {
          id: s.id,
          pointOfSaleId: s.pointOfSaleId ?? null,
          pointOfSaleName: pos?.name ?? null,
          status: s.status,
          openingAmount: Number(s.openingAmount ?? 0),
          closingAmount:
            s.closingAmount != null ? Number(s.closingAmount) : null,
          openedById: s.openedById ?? null,
          closedById: s.closedById ?? null,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        };
      }),
    };
  }

  async listCashSessionMovements(companyId: string, sessionId: string) {
    const session = await this.cashSessionRepo.findOne({
      where: { id: sessionId, companyId },
    });
    if (!session) {
      throw new NotFoundException(
        `Sesión de caja no encontrada: ${sessionId}`,
      );
    }

    const movementTypes = [
      TransactionType.SALE,
      TransactionType.CASH_SESSION_DEPOSIT,
      TransactionType.CASH_SESSION_WITHDRAWAL,
    ];

    let rows = await this.transactionRepo.find({
      where: {
        companyId,
        cashSessionId: sessionId,
        transactionType: In(movementTypes),
      },
      order: { createdAt: 'DESC' },
    });

    // Fallback para ventas Lite anteriores sin cashSessionId.
    if (rows.length === 0) {
      const candidates = await this.transactionRepo.find({
        where: {
          companyId,
          transactionType: TransactionType.SALE,
          ...(session.pointOfSaleId
            ? { pointOfSaleId: session.pointOfSaleId }
            : {}),
          createdAt: MoreThanOrEqual(session.openedAt),
        },
        order: { createdAt: 'DESC' },
      });
      rows = candidates.filter(
        (t) => !session.closedAt || t.createdAt <= session.closedAt,
      );
    }

    return {
      session: {
        id: session.id,
        status: session.status,
        openedAt: session.openedAt.toISOString(),
        closedAt: session.closedAt ? session.closedAt.toISOString() : null,
        openingAmount: Number(session.openingAmount ?? 0),
        closingAmount:
          session.closingAmount != null
            ? Number(session.closingAmount)
            : null,
        expectedAmount:
          session.expectedAmount != null
            ? Number(session.expectedAmount)
            : Number(session.openingAmount ?? 0),
      },
      items: rows.map((t) => {
        const kind =
          t.transactionType === TransactionType.CASH_SESSION_DEPOSIT
            ? 'deposit'
            : t.transactionType === TransactionType.CASH_SESSION_WITHDRAWAL
              ? 'withdrawal'
              : 'sale';
        return {
          id: t.id,
          kind,
          transactionType: t.transactionType,
          documentNumber: t.documentNumber,
          createdAt: t.createdAt.toISOString(),
          total: Number(t.total ?? 0),
          method:
            (t.metadata?.method as string | undefined) ??
            String(t.paymentMethod ?? PaymentMethod.CASH),
          reason:
            typeof t.metadata?.reason === 'string' ? t.metadata.reason : null,
        };
      }),
    };
  }

  async listUsers(companyId: string) {
    const memberships = await this.membershipRepo.find({
      where: { companyId, isActive: true },
    });
    if (!memberships.length) {
      return { items: [] };
    }

    const userIds = memberships.map((m) => m.userId);
    const users = await this.userRepo.find({ where: { id: In(userIds) } });
    const byId = new Map(users.map((u) => [u.id, u]));

    const items: Array<{
      id: string;
      name: string;
      userName: string;
      mail: string;
      email: string;
      roles: string[];
    }> = [];
    for (const membership of memberships) {
      const user = byId.get(membership.userId);
      if (!user) continue;
      const roles = await this.roleRepo.find({
        where: { membershipId: membership.id },
      });
      const roleCodes = roles.map((r) => String(r.role));
      if (membership.isOwner && !roleCodes.includes('OWNER')) {
        roleCodes.unshift('OWNER');
      }
      items.push({
        id: user.id,
        name: user.userName,
        userName: user.userName,
        mail: user.mail,
        email: user.mail,
        roles: roleCodes,
      });
    }
    return { items };
  }

  async createUser(companyId: string, dto: LiteCreateUserDto) {
    const userName = dto.userName.trim();
    const mail = dto.mail.trim().toLowerCase();
    if (userName.length < 3) {
      throw new BadRequestException('El usuario debe tener al menos 3 caracteres');
    }
    if (dto.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const role = dto.role as LiteUserRoleCode;
    const existingName = await this.userRepo.findOne({ where: { userName } });
    if (existingName) {
      throw new ConflictException(`Ya existe el usuario "${userName}"`);
    }
    const existingMail = await this.userRepo.findOne({ where: { mail } });
    if (existingMail) {
      throw new ConflictException(`Ya existe un usuario con el email "${mail}"`);
    }

    const firstName = (dto.firstName?.trim() || userName).slice(0, 80);
    const lastName = dto.lastName?.trim() || undefined;
    const documentNumber = `LITE-${Date.now().toString(36).toUpperCase()}`;

    const person = await this.personRepo.save(
      this.personRepo.create({
        type: PersonType.NATURAL,
        firstName,
        lastName,
        email: mail,
        documentNumber,
        companyId,
      }),
    );

    const rounds = this.config.app.security.bcryptRounds;
    const userRole =
      role === 'ADMIN' ? UserRole.ADMIN : UserRole.POS_OPERATOR;
    const platformRole =
      role === 'ADMIN'
        ? PlatformRoleCode.ADMIN
        : PlatformRoleCode.POS_OPERATOR;

    const user = await this.userRepo.save(
      this.userRepo.create({
        userName,
        pass: await bcrypt.hash(dto.password, rounds),
        mail,
        rol: userRole,
        companyId,
        person,
      }),
    );

    const membership = await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: user.id,
        companyId,
        isOwner: false,
        isActive: true,
      }),
    );
    await this.roleRepo.save(
      this.roleRepo.create({
        membershipId: membership.id,
        role: platformRole,
      }),
    );

    return {
      id: user.id,
      name: user.userName,
      userName: user.userName,
      mail: user.mail,
      email: user.mail,
      roles: [String(platformRole)],
    };
  }
}

function tenderBreakdownFromCounts(
  counts: Record<string, number>,
  cashFallback: number,
): CashSessionTenderBreakdown {
  const n = (key: string) => {
    const v = Number(counts[key] ?? 0);
    return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  };
  const cash = n('CASH') || Math.max(0, Math.round(cashFallback));
  return {
    cash,
    debitCard: n('DEBIT_CARD'),
    creditCard: n('CREDIT_CARD'),
    transfer: n('TRANSFER'),
    check: n('CHECK'),
    other: 0,
  };
}
