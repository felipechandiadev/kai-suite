import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TreasuryAccount,
  TreasuryAccountType,
} from '@modules/treasury-accounts/domain/treasury-account.entity';
import { Company } from '@modules/companies/domain/company.entity';

@Injectable()
export class TreasuryAccountsService {
  constructor(
    @InjectRepository(TreasuryAccount)
    private readonly treasuryAccountRepository: Repository<TreasuryAccount>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findAll() {
    const company = await this.companyRepository.findOne({ where: {} });

    if (!company || !company.bankAccounts) {
      return {
        success: true,
        data: [],
      };
    }

    const accounts = company.bankAccounts.map((account: any) => ({
      id: account.accountKey || account.accountNumber,
      name: `${account.accountType} ${account.bankName}`,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      type: 'BANK',
    }));

    return {
      success: true,
      data: accounts,
    };
  }
}
