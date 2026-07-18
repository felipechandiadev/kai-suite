import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { CatalogRealtimeModule } from '@modules/catalog-realtime/catalog-realtime.module';
import { Recipe } from './domain/recipe.entity';
import { RecipeLine } from './domain/recipe-line.entity';
import { RecipesService } from './application/recipes.service';
import { RecipeCtpService } from './application/recipe-ctp.service';
import { RecipesSchemaBootstrap } from './application/recipes-schema.bootstrap';
import { RecipesController } from './presentation/recipes.controller';

@Module({
  imports: [
    forwardRef(() => CatalogRealtimeModule),
    TypeOrmModule.forFeature([
      Recipe,
      RecipeLine,
      ProductVariant,
      ProductVariantProductionUnit,
      ProductionUnit,
      StockLevel,
      Storage,
    ]),
  ],
  providers: [RecipesService, RecipeCtpService, RecipesSchemaBootstrap],
  controllers: [RecipesController],
  exports: [RecipesService, RecipeCtpService],
})
export class RecipesModule {}
