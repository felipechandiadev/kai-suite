import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ShareholdersService } from '../application/shareholders.service';
import type { CreateShareholderBody } from '../application/dto/create-shareholder.dto';

@Controller('shareholders')
export class ShareholdersController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  @Get()
  async listShareholders(@Query('companyId') companyId?: string) {
    return await this.shareholdersService.listShareholders(companyId);
  }

  @Post()
  async create(@Body() body: CreateShareholderBody) {
    return await this.shareholdersService.create(body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('companyId') companyId: string) {
    return await this.shareholdersService.remove(companyId, id);
  }
}
