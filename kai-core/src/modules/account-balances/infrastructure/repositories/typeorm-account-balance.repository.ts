import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  AccountBalanceRepositoryPort,
  LedgerEntryBalancePayload,
} from '../../application/ports/account-balance.repository.port';
import { AccountBalance } from '../../domain/account-balance.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';

@Injectable()
export class TypeOrmAccountBalanceRepository implements AccountBalanceRepositoryPort {
  constructor(
    @InjectRepository(AccountBalance)
    private readonly balanceRepository: Repository<AccountBalance>,
    @InjectRepository(AccountingPeriod)
    private readonly periodRepository: Repository<AccountingPeriod>,
    private readonly dataSource: DataSource,
  ) {}

  async updateBalancesForLedgerEntries(
    ledgerEntries: LedgerEntryBalancePayload[],
  ): Promise<void> {
    if (!ledgerEntries || ledgerEntries.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const groupedEntries = new Map<
        string,
        {
          accountId: string;
          periodId: string;
          totalDebit: number;
          totalCredit: number;
          companyId: string;
        }
      >();

      for (const entry of ledgerEntries) {
        const transaction = await queryRunner.manager
          .createQueryBuilder()
          .select(['t.id', 't.periodId', 't.companyId'])
          .from('transactions', 't')
          .where('t.id = :transactionId', {
            transactionId: entry.transactionId,
          })
          .getRawOne();

        if (!transaction || !transaction.periodId) {
          continue;
        }

        const key = `${entry.accountId}-${transaction.periodId}`;
        const existing = groupedEntries.get(key);

        if (existing) {
          existing.totalDebit += Number(entry.debit);
          existing.totalCredit += Number(entry.credit);
        } else {
          groupedEntries.set(key, {
            accountId: entry.accountId,
            periodId: transaction.periodId,
            companyId: transaction.companyId,
            totalDebit: Number(entry.debit),
            totalCredit: Number(entry.credit),
          });
        }
      }

      for (const group of groupedEntries.values()) {
        let balance = await queryRunner.manager.findOne(AccountBalance, {
          where: {
            accountId: group.accountId,
            periodId: group.periodId,
          },
        });

        if (balance) {
          if (balance.frozen) {
            throw new Error(
              `Cannot update balance for frozen period ${group.periodId}`,
            );
          }

          balance.periodDebit = Number(balance.periodDebit) + group.totalDebit;
          balance.periodCredit =
            Number(balance.periodCredit) + group.totalCredit;
          balance.closingDebit =
            Number(balance.openingDebit) + Number(balance.periodDebit);
          balance.closingCredit =
            Number(balance.openingCredit) + Number(balance.periodCredit);
          await queryRunner.manager.save(balance);
        } else {
          balance = queryRunner.manager.create(AccountBalance, {
            companyId: group.companyId,
            accountId: group.accountId,
            periodId: group.periodId,
            openingDebit: 0,
            openingCredit: 0,
            periodDebit: group.totalDebit,
            periodCredit: group.totalCredit,
            closingDebit: group.totalDebit,
            closingCredit: group.totalCredit,
            frozen: false,
          });
          await queryRunner.manager.save(balance);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async freezeBalancesForPeriod(periodId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balances = await queryRunner.manager.find(AccountBalance, {
        where: { periodId },
      });

      for (const balance of balances) {
        balance.frozen = true;
        balance.frozenAt = new Date();
        balance.closingDebit =
          Number(balance.openingDebit) + Number(balance.periodDebit);
        balance.closingCredit =
          Number(balance.openingCredit) + Number(balance.periodCredit);
        await queryRunner.manager.save(balance);
      }

      const closedPeriod = await queryRunner.manager.findOne(AccountingPeriod, {
        where: { id: periodId },
      });

      if (closedPeriod) {
        const nextPeriod = await queryRunner.manager
          .createQueryBuilder(AccountingPeriod, 'ap')
          .andWhere('ap.startDate > :endDate', {
            endDate: closedPeriod.endDate,
          })
          .orderBy('ap.startDate', 'ASC')
          .getOne();

        if (nextPeriod) {
          const closingBalances = balances;

          for (const closingBalance of closingBalances) {
            let nextBalance = await queryRunner.manager.findOne(
              AccountBalance,
              {
                where: {
                  accountId: closingBalance.accountId,
                  periodId: nextPeriod.id,
                },
              },
            );

            if (nextBalance) {
              nextBalance.openingDebit = closingBalance.closingDebit;
              nextBalance.openingCredit = closingBalance.closingCredit;
              nextBalance.closingDebit =
                Number(nextBalance.openingDebit) +
                Number(nextBalance.periodDebit);
              nextBalance.closingCredit =
                Number(nextBalance.openingCredit) +
                Number(nextBalance.periodCredit);
              await queryRunner.manager.save(nextBalance);
            } else {
              nextBalance = queryRunner.manager.create(AccountBalance, {
                companyId: closingBalance.companyId,
                accountId: closingBalance.accountId,
                periodId: nextPeriod.id,
                openingDebit: closingBalance.closingDebit,
                openingCredit: closingBalance.closingCredit,
                periodDebit: 0,
                periodCredit: 0,
                closingDebit: closingBalance.closingDebit,
                closingCredit: closingBalance.closingCredit,
                frozen: false,
              });
              await queryRunner.manager.save(nextBalance);
            }
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findBalancesForPeriod(
    companyId: string,
    periodId: string,
  ): Promise<AccountBalance[]> {
    const balances = await this.balanceRepository.find({
      where: { companyId, periodId },
      relations: ['account', 'period', 'company'],
      order: { account: { code: 'ASC' } },
    });

    return balances;
  }
}
