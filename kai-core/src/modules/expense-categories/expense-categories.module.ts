import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ExpenseCategory } from './domain/expense-category.entity';
import { ExpenseCategoriesService } from './application/expense-categories.service';
import { ExpenseCategoriesController } from './presentation/expense-categories.controller';
import { ExpenseCategoriesRepository } from './infrastructure/expense-categories.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategory]), CqrsModule],
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService, ExpenseCategoriesRepository],
  exports: [ExpenseCategoriesService],
})
export class ExpenseCategoriesModule {}
