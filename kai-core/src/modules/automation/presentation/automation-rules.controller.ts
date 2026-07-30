import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AutomationRulesService, CreateAutomationRuleDto, UpdateAutomationRuleDto } from '../application/automation-rules.service';
import { AutomationEventType } from '../domain/automation-event-type.enum';

@Controller('automation/rules')
export class AutomationRulesController {
  constructor(private readonly service: AutomationRulesService) {}

  @Get()
  async list(@Query('companyId') companyId: string, @Query('eventType') eventType?: AutomationEventType) {
    if (!companyId) {
      return { success: false, message: 'companyId is required' };
    }
    const rows = await this.service.list(companyId, eventType);
    return { success: true, data: rows };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const row = await this.service.findById(id);
    if (!row) {
      return { success: false, message: 'Rule not found', statusCode: 404 };
    }
    return { success: true, data: row };
  }

  @Post()
  async create(@Body() dto: CreateAutomationRuleDto) {
    const created = await this.service.create(dto);
    return { success: true, data: created };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    const updated = await this.service.update(id, dto);
    return { success: true, data: updated };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('test')
  async test(
    @Query('companyId') companyId: string,
    @Query('eventType') eventType: AutomationEventType,
    @Body() payload: any,
  ) {
    if (!companyId) {
      return { success: false, message: 'companyId is required' };
    }
    const et = eventType ?? AutomationEventType.TRANSACTION_CREATED;
    const matched = await this.service.simulate({ companyId, eventType: et, payload });
    return { success: true, data: matched };
  }
}

