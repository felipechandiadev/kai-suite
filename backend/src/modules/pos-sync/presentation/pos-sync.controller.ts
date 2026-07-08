import { Body, Controller, Post } from '@nestjs/common';
import { PosSyncService } from '../application/pos-sync.service';

@Controller('pos/sync')
export class PosSyncController {
  constructor(private readonly posSyncService: PosSyncService) {}

  @Post('commands')
  async syncCommand(@Body() body: Record<string, unknown>) {
    return this.posSyncService.syncCommand(body);
  }

  @Post('commands/batch')
  async syncCommandsBatch(@Body() body: { commands?: Record<string, unknown>[] }) {
    const commands = Array.isArray(body?.commands) ? body.commands : [];
    return this.posSyncService.syncCommandBatch(commands);
  }
}
