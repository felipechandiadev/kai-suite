import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { SignalBoardService } from '../application/signal-board.service';
import type { SignalsBoardResponse } from '../domain/signal.types';
import type { SignalEvidenceDto } from '../domain/signal-evidence.types';
import { SignalsBoardQueryDto } from './dto/signals-board-query.dto';

@Controller('signals')
export class SignalsController {
  constructor(private readonly boardService: SignalBoardService) {}

  @Get('board')
  async board(
    @CurrentCompany() companyId: string,
    @Query() query: SignalsBoardQueryDto,
  ): Promise<SignalsBoardResponse> {
    return this.boardService.getBoard(companyId, {
      branchId: query.branchId,
    });
  }

  @Get(':id/evidence')
  async evidence(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Query() query: SignalsBoardQueryDto,
  ): Promise<SignalEvidenceDto> {
    return this.boardService.getEvidence(companyId, id, {
      branchId: query.branchId,
    });
  }
}
