import { Controller, Get, Query, Param } from '@nestjs/common';
import { AuditsService } from '../application/audits.service';
import { SearchAuditsDto } from '../application/dto/search-audits.dto';

@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  async search(@Query() query: SearchAuditsDto) {
    return this.auditsService.search(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auditsService.findOne(id);
  }
}
