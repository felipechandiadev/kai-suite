import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { InventoryReportRunner } from '../application/inventory-report.runner';
import { RunInventoryReportDto } from './dto/run-inventory-report.dto';
import type {
  InventoryReportCatalogItem,
  InventoryReportRunResult,
} from '../domain/inventory-report.types';

@Controller('inventory-reports')
export class InventoryReportsController {
  constructor(private readonly runner: InventoryReportRunner) {}

  @Get()
  listCatalog(): InventoryReportCatalogItem[] {
    return this.runner.listCatalog();
  }

  @Post(':reportId/run')
  async run(
    @CurrentCompany() companyId: string,
    @Param('reportId') reportId: string,
    @Body() body: RunInventoryReportDto,
  ): Promise<InventoryReportRunResult> {
    return this.runner.run(companyId, reportId, body?.params ?? {});
  }
}
