import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '@modules/branches/branches.module';
import { SalesReportsModule } from '@modules/sales-reports/sales-reports.module';
import { InventoryReportsModule } from '@modules/inventory-reports/inventory-reports.module';
import { PurchasingReportsModule } from '@modules/purchasing-reports/purchasing-reports.module';
import { DiningReportsModule } from '@modules/dining-reports/dining-reports.module';
import { HcmReportsModule } from '@modules/hcm-reports/hcm-reports.module';
import { LiraModule } from '@modules/lira/lira.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { AssistantConversation } from './domain/assistant-conversation.entity';
import { AssistantMessage } from './domain/assistant-message.entity';
import { AssistantAuditLog } from './domain/assistant-audit-log.entity';
import { AssistantReport } from './domain/assistant-report.entity';
import { AssistantFavorite } from './domain/assistant-favorite.entity';
import { AssistantScheduledReport } from './domain/assistant-scheduled-report.entity';
import { AssistantController } from './presentation/assistant.controller';
import { AssistantOrchestrator } from './application/assistant-orchestrator.service';
import { AssistantToolExecutor } from './application/assistant-tool-executor.service';
import { AssistantPersistenceService } from './application/assistant-persistence.service';
import { AssistantCatalogService } from './application/assistant-catalog.service';
import { AssistantRateLimiter } from './application/assistant-rate-limiter.service';
import { SemanticQueryValidator } from './application/semantic-query-validator.service';
import { SemanticQueryCompiler } from './application/semantic-query-compiler.service';
import { AssistantExportService } from './application/assistant-export.service';
import {
  OpenAIAssistantClient,
  OpenAIAssistantPort,
} from './infrastructure/openai/openai-assistant.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssistantConversation,
      AssistantMessage,
      AssistantAuditLog,
      AssistantReport,
      AssistantFavorite,
      AssistantScheduledReport,
    ]),
    BranchesModule,
    SalesReportsModule,
    InventoryReportsModule,
    PurchasingReportsModule,
    DiningReportsModule,
    HcmReportsModule,
    CustomersModule,
    LiraModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantOrchestrator,
    AssistantToolExecutor,
    AssistantPersistenceService,
    AssistantCatalogService,
    AssistantRateLimiter,
    SemanticQueryValidator,
    SemanticQueryCompiler,
    AssistantExportService,
    { provide: OpenAIAssistantPort, useClass: OpenAIAssistantClient },
  ],
})
export class AssistantModule {}
