import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant/tenant.decorators';
import { DiningBoardService } from '../application/dining-board.service';
import {
  DiningBoardDisplayGuard,
  type DiningBoardDisplayRequest,
} from './dining-board-display.guard';
import type { DiningBoardDisplay } from '../domain/dining-board-display.entity';

@Controller('dining/board')
@SkipTenant()
@UseGuards(DiningBoardDisplayGuard)
export class DiningBoardPublicController {
  constructor(private readonly boardService: DiningBoardService) {}

  @Get('snapshot')
  async snapshot(@Req() req: DiningBoardDisplayRequest) {
    const display = req.boardDisplay as DiningBoardDisplay;
    return this.boardService.getSnapshotForDisplay(display);
  }
}
