import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CashHubsService } from '../application/cash-hubs.service';
import { CreateCashHubBodyDto, UpdateCashHubBodyDto } from '../application/dto/cash-hub.dto';

@Controller('cash-hubs')
export class CashHubsController {
  constructor(private readonly cashHubsService: CashHubsService) {}

  @Get()
  async list(@Query('companyId') companyId: string) {
    if (!companyId?.trim()) {
      return { success: false, error: 'companyId es requerido' };
    }
    const items = await this.cashHubsService.listByCompany(companyId.trim());
    return { success: true, items };
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Query('companyId') companyId: string) {
    if (!companyId?.trim()) {
      return { success: false, error: 'companyId es requerido' };
    }
    const hub = await this.cashHubsService.getOne(id, companyId.trim());
    return { success: true, hub };
  }

  @Post()
  async create(@Body() body: CreateCashHubBodyDto) {
    const hub = await this.cashHubsService.create(body);
    return { success: true, hub };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() body: UpdateCashHubBodyDto,
  ) {
    if (!companyId?.trim()) {
      return { success: false, error: 'companyId es requerido' };
    }
    const hub = await this.cashHubsService.update(id, companyId.trim(), body);
    return { success: true, hub };
  }
}
