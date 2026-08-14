import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { PrintAgent } from './domain/print-agent.entity';
import { PrintAgentsService } from './application/print-agents.service';
import { PrintAgentGuard } from './presentation/print-agent.guard';
import { PrintAgentsController } from './presentation/print-agents.controller';
import { PrintAgentsPublicController } from './presentation/print-agents-public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrintAgent, Branch, Company])],
  controllers: [PrintAgentsController, PrintAgentsPublicController],
  providers: [PrintAgentsService, PrintAgentGuard],
  exports: [PrintAgentsService],
})
export class PrintAgentsModule {}
