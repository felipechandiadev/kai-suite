import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { PricingService } from '../application/pricing.service';
import { PricingCalculateDto, PricingSnapshotsQueryDto } from './dto/pricing.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  calculate(@CurrentCompany() companyId: string, @Body() dto: PricingCalculateDto) {
    return this.pricingService.calculate(companyId, dto);
  }

  @Post('snapshots')
  saveSnapshot(@CurrentCompany() companyId: string, @Body() dto: PricingCalculateDto) {
    return this.pricingService.saveSnapshot(companyId, dto);
  }

  @Get('snapshots')
  listSnapshots(
    @CurrentCompany() companyId: string,
    @Query() query: PricingSnapshotsQueryDto,
  ) {
    return this.pricingService.listSnapshots(companyId, query.weekIso);
  }

  @Get('snapshots/:id')
  getSnapshot(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.pricingService.getSnapshot(companyId, id);
  }

  @Post('snapshots/:id/apply')
  applySnapshot(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.pricingService.applySnapshot(companyId, id);
  }
}
