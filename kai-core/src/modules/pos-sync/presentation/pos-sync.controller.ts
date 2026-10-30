import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@common/tenant/current-user.decorator';
import type { CurrentUserPayload } from '@common/tenant/current-user.decorator';
import { PosSyncService } from '../application/pos-sync.service';

@Controller('pos/sync')
export class PosSyncController {
  constructor(private readonly posSyncService: PosSyncService) {}

  @Post('commands')
  async syncCommand(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posSyncService.syncCommand({ ...body, userName: user.userName });
  }

  @Post('commands/batch')
  async syncCommandsBatch(
    @Body() body: { commands?: Record<string, unknown>[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const commands = (Array.isArray(body?.commands) ? body.commands : []).map((c) => ({
      ...c,
      userName: user.userName,
    }));
    return this.posSyncService.syncCommandBatch(commands);
  }
}
