import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { buildLedger } from '@shared/application/AccountingEngine';
import { BuildLedgerDto } from '../../dto/build-ledger.dto';

export interface BuildLedgerResult {
  success: boolean;
  data: {
    accounts: any[];
    postings: any[];
    balanceByAccount: Record<string, any>;
  };
}

export class BuildLedgerCommand {
  constructor(public readonly dto: BuildLedgerDto) {}
}

@Injectable()
@CommandHandler(BuildLedgerCommand)
export class BuildLedgerCommandHandler implements ICommandHandler<BuildLedgerCommand> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(command: BuildLedgerCommand): Promise<BuildLedgerResult> {
    const { dto } = command;

    const params: any = {
      companyId: dto.companyId,
    };

    if (dto.from) params.from = new Date(dto.from);
    if (dto.to) params.to = new Date(dto.to);
    if (dto.resultCenterId) params.resultCenterId = dto.resultCenterId;
    if (dto.limitTransactions) params.limitTransactions = dto.limitTransactions;

    const result = await buildLedger(this.dataSource, params);

    return {
      success: true,
      data: {
        accounts: result.accounts,
        postings: result.postings,
        balanceByAccount: result.balanceByAccount,
      },
    };
  }
}
