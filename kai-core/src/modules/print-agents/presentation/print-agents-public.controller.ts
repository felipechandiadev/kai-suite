import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant/tenant.decorators';
import { HeartbeatPrintAgentDto } from '../application/dto/heartbeat-print-agent.dto';
import { PairPrintAgentDto } from '../application/dto/pair-print-agent.dto';
import { PrintAgentsService } from '../application/print-agents.service';
import {
  PrintAgentGuard,
  type PrintAgentRequest,
} from './print-agent.guard';
import type { PrintAgent } from '../domain/print-agent.entity';

/**
 * Endpoints públicos del agente Kai Printers (sin Bearer de usuario).
 * Pair: valida token emitido por Admin.
 * Heartbeat: requiere header X-Print-Agent-Token.
 */
@Controller('print-agents')
@SkipTenant()
export class PrintAgentsPublicController {
  constructor(private readonly agentsService: PrintAgentsService) {}

  @Post('pair')
  async pair(@Body() dto: PairPrintAgentDto) {
    return this.agentsService.pair(dto.pairingToken);
  }

  @Post('heartbeat')
  @UseGuards(PrintAgentGuard)
  async heartbeat(
    @Req() req: PrintAgentRequest,
    @Body() dto: HeartbeatPrintAgentDto,
  ) {
    const agent = req.printAgent as PrintAgent;
    return this.agentsService.heartbeat(agent, {
      displayName: dto.displayName,
      lanHost: dto.lanHost,
      wsPort: dto.wsPort,
      wssPort: dto.wssPort,
      useTls: dto.useTls,
      platform: dto.platform,
    });
  }
}
