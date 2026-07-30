import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
} from '@common/tenant';
import { PromotionsService } from '../application/promotions.service';
import {
  CreatePromotionDto,
  ListPromotionsQueryDto,
  TogglePromotionActiveDto,
  UpdatePromotionDto,
} from '../application/dto/promotion.dtos';

@Controller('promotions')
export class PromotionsAdminController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  async list(
    @Query() q: ListPromotionsQueryDto,
    @CurrentCompany() companyId: string,
  ) {
    const result = await this.service.list(companyId, q);
    return { success: true, ...result };
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const promotion = await this.service.getById(companyId, id);
    return { success: true, promotion };
  }

  @Post()
  async create(
    @Body() body: CreatePromotionDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const promotion = await this.service.create(companyId, user.id, body);
    return { success: true, promotion };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdatePromotionDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const promotion = await this.service.update(companyId, user.id, id, body);
    return { success: true, promotion };
  }

  @Patch(':id/active')
  async toggleActive(
    @Param('id') id: string,
    @Body() body: TogglePromotionActiveDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const promotion = await this.service.setActive(
      companyId,
      user.id,
      id,
      body.isActive,
    );
    return { success: true, promotion };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const result = await this.service.softDelete(companyId, id);
    return { success: true, ...result };
  }
}
