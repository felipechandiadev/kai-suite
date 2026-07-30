import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import {
  AccountingPeriod,
  AccountingPeriodStatus,
} from '../domain/accounting-period.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { AccountBalanceService } from '@modules/account-balances/application/account-balance.service';
import {
  ACCOUNTING_PERIOD_MONTH_NAMES,
  monthBoundsFromYmd,
} from './accounting-period-month.util';

function assertPeriodOpen(period: AccountingPeriod): void {
  if (period.status === AccountingPeriodStatus.CLOSED) {
    throw new BadRequestException(
      `Cannot create transaction in closed period: ${period.name} ` +
        `(${period.startDate} to ${period.endDate}). ` +
        `Please reopen the period or change the transaction date.`,
    );
  }
  if (period.status === AccountingPeriodStatus.LOCKED) {
    throw new BadRequestException(
      `Period is locked: ${period.name}. Cannot create transactions.`,
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
      '23505'
  );
}

@Injectable()
export class AccountingPeriodsService {
  constructor(
    @InjectRepository(AccountingPeriod)
    private readonly accountingPeriodRepository: Repository<AccountingPeriod>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly accountBalanceService: AccountBalanceService,
  ) {}

  /**
   * Get all accounting periods with optional filters
   */
  async findAll(params?: {
    companyId?: string;
    status?: AccountingPeriodStatus;
    year?: number;
  }) {
    const queryBuilder = this.accountingPeriodRepository
      .createQueryBuilder('period')
      .leftJoinAndSelect('period.company', 'company')
      .leftJoinAndSelect('period.closedByUser', 'closedByUser');

    if (params?.companyId) {
      queryBuilder.andWhere('period.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    if (params?.status) {
      queryBuilder.andWhere('period.status = :status', {
        status: params.status,
      });
    }

    if (params?.year) {
      const startOfYear = `${params.year}-01-01`;
      const endOfYear = `${params.year}-12-31`;
      queryBuilder.andWhere('period.startDate >= :startOfYear', {
        startOfYear,
      });
      queryBuilder.andWhere('period.endDate <= :endOfYear', { endOfYear });
    }

    queryBuilder.orderBy('period.startDate', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Find a period by ID
   */
  async findOne(id: string) {
    return await this.accountingPeriodRepository.findOne({
      where: { id },
      relations: ['company', 'closedByUser'],
    });
  }

  /**
   * Create a new accounting period
   */
  async create(data: {
    companyId?: string;
    startDate: string;
    endDate: string;
    name?: string;
    status?: AccountingPeriodStatus;
  }) {
    let companyId = data.companyId;

    // If companyId not provided, get the first available company
    if (!companyId) {
      const firstCompany = await this.companyRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      if (!firstCompany) {
        throw new BadRequestException(
          'No company found. Please create a company first.',
        );
      }

      companyId = firstCompany.id;
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date.');
    }

    // Check for overlapping periods
    const overlapping = await this.accountingPeriodRepository
      .createQueryBuilder('period')
      .where('period.companyId = :companyId', { companyId })
      .andWhere(
        '(period.startDate BETWEEN :startDate AND :endDate OR period.endDate BETWEEN :startDate AND :endDate OR (:startDate BETWEEN period.startDate AND period.endDate))',
        {
          startDate: data.startDate,
          endDate: data.endDate,
        },
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        `Period overlaps with existing period: ${overlapping.name || overlapping.id}`,
      );
    }

    const period = this.accountingPeriodRepository.create({
      companyId,
      startDate: data.startDate,
      endDate: data.endDate,
      name: data.name,
      status: data.status || AccountingPeriodStatus.OPEN,
    });

    return await this.accountingPeriodRepository.save(period);
  }

  /**
   * Ensure an accounting period exists for a given date
   * Creates one if it doesn't exist
   * STRATEGY: Automatic opening, manual closing
   * - Automatically creates periods when transactions are made
   * - Validates period is not closed before allowing transactions
   * - Throws 403 error if trying to transact in closed period
   */
  async ensurePeriod(date: string, companyId?: string) {
    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId) {
      const firstCompany = await this.companyRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      if (!firstCompany) {
        throw new BadRequestException(
          'No company found. Please create a company first.',
        );
      }

      resolvedCompanyId = firstCompany.id;
    }

    const { startDate, endDate, year, month } = monthBoundsFromYmd(date);

    const existing =
      (await this.accountingPeriodRepository.findOne({
        where: { companyId: resolvedCompanyId, startDate, endDate },
      })) ??
      (await this.accountingPeriodRepository
        .createQueryBuilder('period')
        .where('period.companyId = :companyId', { companyId: resolvedCompanyId })
        .andWhere('period.startDate <= :date', { date })
        .andWhere('period.endDate >= :date', { date })
        .getOne());

    if (existing) {
      assertPeriodOpen(existing);
      return existing;
    }

    const period = this.accountingPeriodRepository.create({
      companyId: resolvedCompanyId,
      startDate,
      endDate,
      name: `${ACCOUNTING_PERIOD_MONTH_NAMES[month - 1]} ${year}`,
      status: AccountingPeriodStatus.OPEN,
    });

    try {
      return await this.accountingPeriodRepository.save(period);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const concurrent = await this.accountingPeriodRepository.findOne({
        where: { companyId: resolvedCompanyId, startDate, endDate },
      });
      if (!concurrent) {
        throw error;
      }
      assertPeriodOpen(concurrent);
      return concurrent;
    }
  }

  /**
   * Close an accounting period
   * PHASE 3: Freezes balances to make historical data immutable
   */
  async closePeriod(id: string, userId?: string) {
    const period = await this.findOne(id);

    if (!period) {
      throw new BadRequestException('Period not found.');
    }

    if (period.status === AccountingPeriodStatus.CLOSED) {
      throw new BadRequestException('Period is already closed.');
    }

    if (period.status === AccountingPeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked and cannot be closed.');
    }

    // PHASE 3: Freeze balances before closing
    // This makes historical financial data immutable
    await this.accountBalanceService.freezeBalancesForPeriod(id);

    period.status = AccountingPeriodStatus.CLOSED;
    period.closedAt = new Date();
    period.closedBy = userId || null;

    return await this.accountingPeriodRepository.save(period);
  }

  /**
   * Reopen a closed period
   */
  async reopenPeriod(id: string) {
    const period = await this.findOne(id);

    if (!period) {
      throw new BadRequestException('Period not found.');
    }

    if (period.status === AccountingPeriodStatus.LOCKED) {
      throw new BadRequestException('Period is locked and cannot be reopened.');
    }

    period.status = AccountingPeriodStatus.OPEN;
    period.closedAt = null;
    period.closedBy = null;

    return await this.accountingPeriodRepository.save(period);
  }
}
