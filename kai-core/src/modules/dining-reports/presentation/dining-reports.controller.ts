import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { DiningReportRunner } from '../application/dining-report.runner';
import { RunDiningReportDto } from './dto/run-dining-report.dto';
import type {
  DiningReportCatalogItem,
  DiningReportRunResult,
} from '../domain/dining-report.types';

@Controller('dining-reports')
export class DiningReportsController {
  constructor(private readonly runner: DiningReportRunner) {}

  @Get()
  listCatalog(): DiningReportCatalogItem[] {
    return this.runner.listCatalog();
  }

  @Post(':reportId/run')
  async run(
    @CurrentCompany() companyId: string,
    @Param('reportId') reportId: string,
    @Body() body: RunDiningReportDto,
  ): Promise<DiningReportRunResult> {
    return this.runner.run(companyId, reportId, body?.params ?? {});
  }
}
