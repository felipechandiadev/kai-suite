import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { PackService, UpsertPackLineDto } from '../application/pack.service';

class UpsertPackCompositionDto {
  lines!: UpsertPackLineDto[];
}

@Controller('packs')
export class PacksController {
  constructor(private readonly packService: PackService) {}

  @Get('variants/:variantId/composition')
  async getComposition(
    @CurrentCompany() companyId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.packService.getPackCompositionView(companyId, variantId.trim());
  }

  @Put('variants/:variantId/composition')
  async upsertComposition(
    @CurrentCompany() companyId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpsertPackCompositionDto,
  ) {
    return this.packService.upsertPackComposition(
      companyId,
      variantId.trim(),
      dto.lines ?? [],
    );
  }

  @Get('variants/:variantId/producible-qty')
  async producibleQty(
    @CurrentCompany() companyId: string,
    @Param('variantId') variantId: string,
    @Query('storageId') storageId: string,
  ) {
    if (!storageId?.trim()) {
      return { producibleQty: null, reason: 'NO_STORAGE' };
    }
    return this.packService.computeProducibleQty(
      companyId,
      variantId.trim(),
      storageId.trim(),
    );
  }

  @Get('variants/:variantId/pmp-summary')
  async pmpSummary(
    @CurrentCompany() companyId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.packService.computePmpSummary(companyId, variantId.trim());
  }
}
