import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Category } from './domain/category.entity';
import { Product } from '@modules/products/domain/product.entity';
import { CategoryService } from './application/category.service';
import { CategoryServiceAdapter } from './application/category.service.adapter';
import { CategoryController } from './presentation/category.controller';
import { TypeOrmCategoryRepository } from './infrastructure/repositories/typeorm-category.repository';
import { CategoryRepositoryPort } from './application/ports/category.repository.port';

// Command Handlers
import { CreateCategoryCommandHandler } from './application/handlers/commands/create-category.handler';
import { UpdateCategoryCommandHandler } from './application/handlers/commands/update-category.handler';
import { RemoveCategoryCommandHandler } from './application/handlers/commands/remove-category.handler';

// Query Handlers
import { GetAllCategoriesQueryHandler } from './application/handlers/queries/get-all-categories.handler';
import { GetCategoryQueryHandler } from './application/handlers/queries/get-category.handler';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product]),
    CqrsModule,
    MultimediaModule,
  ],
  controllers: [CategoryController],
  providers: [
    // Legacy service for backward compatibility
    CategoryService,

    // CQRS Adapter
    CategoryServiceAdapter,

    // Repository
    {
      provide: 'CategoryRepositoryPort',
      useClass: TypeOrmCategoryRepository,
    },

    // Command Handlers
    CreateCategoryCommandHandler,
    UpdateCategoryCommandHandler,
    RemoveCategoryCommandHandler,

    // Query Handlers
    GetAllCategoriesQueryHandler,
    GetCategoryQueryHandler,
  ],
  exports: [CategoryService, CategoryServiceAdapter],
})
export class CategoriesModule {}
