import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Shareholder } from './domain/shareholder.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { ShareholdersService } from './application/shareholders.service';
import { ShareholdersController } from './presentation/shareholders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shareholder, Person, Company]), CqrsModule],
  controllers: [ShareholdersController],
  providers: [ShareholdersService],
  exports: [ShareholdersService],
})
export class ShareholdersModule {}
