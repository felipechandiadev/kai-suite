import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { SalesReportRunner } from '../application/sales-report.runner';
import { RunSalesReportDto } from './dto/run-sales-report.dto';
import type {
  SalesReportCatalogItem,
  SalesReportRunResult,
} from '../domain/sales-report.types';

@Controller('sales-reports')
export class SalesReportsController {
  constructor(private readonly runner: SalesReportRunner) {}

  @Get()
  listCatalog(): SalesReportCatalogItem[] {
    return this.runner.listCatalog();
  }

  @Post(':reportId/run')
  async run(
    @CurrentCompany() companyId: string,
    @Param('reportId') reportId: string,
    @Body() body: RunSalesReportDto,
  ): Promise<SalesReportRunResult> {
    return this.runner.run(companyId, reportId, body?.params ?? {});
  }
}
