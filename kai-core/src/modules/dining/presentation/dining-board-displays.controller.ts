import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { DiningBoardService } from '../application/dining-board.service';
import { CreateDiningBoardDisplayDto } from '../application/dto/create-dining-board-display.dto';

@Controller('dining/board-displays')
export class DiningBoardDisplaysController {
  constructor(private readonly boardService: DiningBoardService) {}

  @Get()
  async list(@Query('branchId') branchId?: string) {
    return this.boardService.listDisplays(branchId);
  }

  @Post()
  async create(@Body() dto: CreateDiningBoardDisplayDto) {
    return this.boardService.createDisplay({
      branchId: dto.branchId,
      name: dto.name,
    });
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    return this.boardService.revokeDisplay(id);
  }
}
