import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { PurchasingReportRunner } from '../application/purchasing-report.runner';
import { RunPurchasingReportDto } from './dto/run-purchasing-report.dto';
import type {
  PurchasingReportCatalogItem,
  PurchasingReportRunResult,
} from '../domain/purchasing-report.types';

@Controller('purchasing-reports')
export class PurchasingReportsController {
  constructor(private readonly runner: PurchasingReportRunner) {}

  @Get()
  listCatalog(): PurchasingReportCatalogItem[] {
    return this.runner.listCatalog();
  }

  @Post(':reportId/run')
  async run(
    @CurrentCompany() companyId: string,
    @Param('reportId') reportId: string,
    @Body() body: RunPurchasingReportDto,
  ): Promise<PurchasingReportRunResult> {
    return this.runner.run(companyId, reportId, body?.params ?? {});
  }
}
