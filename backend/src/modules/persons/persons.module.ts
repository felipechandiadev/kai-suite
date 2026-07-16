import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Person } from './domain/person.entity';
import { PersonsService } from './application/persons.service';
import { PersonsController } from './presentation/persons.controller';
import { PersonsSchemaBootstrap } from './application/persons-schema.bootstrap';

@Module({
  imports: [TypeOrmModule.forFeature([Person]), CqrsModule],
  controllers: [PersonsController],
  providers: [PersonsService, PersonsSchemaBootstrap],
  exports: [PersonsService],
})
export class PersonsModule {}
