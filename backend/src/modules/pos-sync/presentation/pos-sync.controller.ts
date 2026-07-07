import { Body, Controller, Post } from '@nestjs/common';
import { PosSyncService } from '../application/pos-sync.service';
import { SyncSaleCommandDto } from '../application/dto/sync-sale-command.dto';

@Controller('pos/sync')
export class PosSyncController {
  constructor(private readonly posSyncService: PosSyncService) {}

  @Post('commands')
  async syncCommand(@Body() body: SyncSaleCommandDto) {
    const result = await this.posSyncService.syncSaleCommand(body);
    return result;
  }
}
