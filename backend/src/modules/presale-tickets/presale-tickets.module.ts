import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresaleTicket } from './domain/presale-ticket.entity';
import { PresaleTicketLine } from './domain/presale-ticket-line.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { PresaleTicketsService } from './application/presale-tickets.service';
import { PresaleTicketCodeService } from './application/presale-ticket-code.service';
import { PresaleTicketsController } from './presentation/presale-tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PresaleTicket,
      PresaleTicketLine,
      PointOfSale,
      Branch,
    ]),
    CompaniesModule,
  ],
  controllers: [PresaleTicketsController],
  providers: [PresaleTicketsService, PresaleTicketCodeService],
  exports: [PresaleTicketsService],
})
export class PresaleTicketsModule {}
