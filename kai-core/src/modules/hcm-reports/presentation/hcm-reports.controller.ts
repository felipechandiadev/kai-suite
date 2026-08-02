import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { HcmReportRunner } from '../application/hcm-report.runner';
import { RunHcmReportDto } from './dto/run-hcm-report.dto';
import type {
  HcmReportCatalogItem,
  HcmReportRunResult,
} from '../domain/hcm-report.types';

@Controller('hcm-reports')
export class HcmReportsController {
  constructor(private readonly runner: HcmReportRunner) {}

  @Get()
  listCatalog(): HcmReportCatalogItem[] {
    return this.runner.listCatalog();
  }

  @Post(':reportId/run')
  async run(
    @CurrentCompany() companyId: string,
    @Param('reportId') reportId: string,
    @Body() body: RunHcmReportDto,
  ): Promise<HcmReportRunResult> {
    return this.runner.run(companyId, reportId, body?.params ?? {});
  }
}
