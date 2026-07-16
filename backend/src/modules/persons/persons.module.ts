import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Person } from './domain/person.entity';
import { PersonsService } from './application/persons.service';
import { PersonsController } from './presentation/persons.controller';
import { PersonsSchemaBootstrap } from './application/persons-schema.bootstrap';
import { SiiTaxStatusService } from './application/sii-tax-status.service';
import { SiiStcHttpClient } from './infrastructure/sii-stc-http.client';

@Module({
  imports: [TypeOrmModule.forFeature([Person]), CqrsModule],
  controllers: [PersonsController],
  providers: [
    PersonsService,
    PersonsSchemaBootstrap,
    SiiTaxStatusService,
    SiiStcHttpClient,
  ],
  exports: [PersonsService],
})
export class PersonsModule {}
