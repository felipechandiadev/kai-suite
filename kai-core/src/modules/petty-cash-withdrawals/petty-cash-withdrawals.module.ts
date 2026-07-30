import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { PettyCashWithdrawalsService } from './application/petty-cash-withdrawals.service';
import { PettyCashWithdrawalsController } from './presentation/petty-cash-withdrawals.controller';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([User, Branch]), TransactionsModule],
  controllers: [PettyCashWithdrawalsController],
  providers: [PettyCashWithdrawalsService],
  exports: [PettyCashWithdrawalsService],
})
export class PettyCashWithdrawalsModule {}
