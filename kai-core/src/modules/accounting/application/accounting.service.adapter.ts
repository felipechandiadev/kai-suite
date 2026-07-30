import { Injectable } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { AccountingService } from './accounting.service';
import {
  GetAccountHierarchyQuery,
  GetAccountHierarchyResult,
} from './handlers/queries/get-account-hierarchy.query';
import {
  GetLedgerDataQuery,
  GetLedgerDataResult,
} from './handlers/queries/get-ledger-data.query';
import {
  BuildLedgerCommand,
  BuildLedgerResult,
} from './handlers/commands/build-ledger.command';
import { BuildLedgerDto } from './dto/build-ledger.dto';

@Injectable()
export class AccountingServiceAdapter extends AccountingService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    super(null as any); // We don't need the dataSource since we're delegating to CQRS
  }

  async getHierarchy(includeInactive: boolean = false): Promise<any[]> {
    const result: GetAccountHierarchyResult = await this.queryBus.execute(
      new GetAccountHierarchyQuery(includeInactive),
    );
    return result.hierarchy;
  }

  async getLedgerData(includeInactive: boolean = false): Promise<any> {
    const result: GetLedgerDataResult = await this.queryBus.execute(
      new GetLedgerDataQuery(includeInactive),
    );
    return result;
  }

  async buildLedger(dto: BuildLedgerDto): Promise<any> {
    const result: BuildLedgerResult = await this.commandBus.execute(
      new BuildLedgerCommand(dto),
    );
    return result.data;
  }
}
