import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CapitalContributionsService } from '../application/capital-contributions.service';
import { CreateCapitalContributionRequestDto } from '../application/dto/create-capital-contribution-request.dto';

@Controller('capital-contributions')
export class CapitalContributionsController {
  constructor(
    private readonly capitalContributionsService: CapitalContributionsService,
  ) {}

  @Get()
  async list() {
    return this.capitalContributionsService.list();
  }

  @Get(':id')
  async findOne(@Param('id') _id: string) {
    return this.capitalContributionsService.findOne();
  }

  @Post()
  async create(@Body() data: CreateCapitalContributionRequestDto) {
    return this.capitalContributionsService.create(data);
  }
}
