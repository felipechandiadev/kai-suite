import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '@common/tenant/tenant.decorators';
import { CreatePrintAgentDto } from '../application/dto/create-print-agent.dto';
import { UpdatePrintAgentDto } from '../application/dto/update-print-agent.dto';
import { PrintAgentsService } from '../application/print-agents.service';

@Controller('print-agents')
export class PrintAgentsController {
  constructor(private readonly agentsService: PrintAgentsService) {}

  @Get()
  async list(@Query('branchId') branchId?: string) {
    return this.agentsService.list(branchId);
  }

  @AdminOnly()
  @Post()
  async create(@Body() dto: CreatePrintAgentDto) {
    return this.agentsService.create({
      displayName: dto.displayName,
      branchId: dto.branchId,
    });
  }

  @AdminOnly()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePrintAgentDto) {
    return this.agentsService.update(id, {
      displayName: dto.displayName,
      branchId: dto.branchId,
      revoke: dto.revoke,
    });
  }
}
