import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
} from '@common/tenant';
import { PresaleTicketsService } from '../application/presale-tickets.service';
import { CreatePresaleTicketDto } from '../application/dto/presale-ticket.dtos';

@Controller('presale-tickets')
export class PresaleTicketsController {
  constructor(private readonly presaleTicketsService: PresaleTicketsService) {}

  @Post()
  async create(
    @Body() body: CreatePresaleTicketDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const ticket = await this.presaleTicketsService.create(
      companyId,
      user.id,
      body,
    );
    return { success: true, ticket };
  }

  @Get('by-code/:code')
  async getByCode(
    @Param('code') code: string,
    @Query('pointOfSaleId') pointOfSaleId: string | undefined,
    @CurrentCompany() companyId: string,
  ) {
    const ticket = await this.presaleTicketsService.findByCode(
      companyId,
      code,
      pointOfSaleId,
    );
    return { success: true, ticket };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const ticket = await this.presaleTicketsService.cancel(
      companyId,
      id,
      user.id,
    );
    return { success: true, ticket };
  }
}
