import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { RecipesService } from '../application/recipes.service';
import { RecipeCtpService } from '../application/recipe-ctp.service';
import { CreateRecipeDto } from '../application/dto/create-recipe.dto';
import { UpdateRecipeDto } from '../application/dto/update-recipe.dto';
import { CtpBatchRequestDto } from '../application/dto/ctp-batch.dto';
import { CtpDetailQueryDto } from '../application/dto/ctp-detail-query.dto';
import { CtpByStorageQueryDto } from '../application/dto/ctp-by-storage-query.dto';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly recipeCtpService: RecipeCtpService,
  ) {}

  @Get()
  async list(
    @CurrentCompany() companyId: string,
    @Query('outputVariantId') outputVariantId?: string,
  ) {
    return this.recipesService.list(companyId, outputVariantId);
  }

  @Post('ctp/batch')
  async ctpBatch(
    @CurrentCompany() companyId: string,
    @Body() dto: CtpBatchRequestDto,
  ) {
    const results = await this.recipeCtpService.computeForVariants(
      companyId,
      dto.items ?? [],
      dto.branchId,
    );
    return { results };
  }

  @Get('ctp/detail')
  async ctpDetail(
    @CurrentCompany() companyId: string,
    @Query() query: CtpDetailQueryDto,
  ) {
    return this.recipeCtpService.computeDetailForVariant(
      companyId,
      query.variantId,
      query.branchId,
    );
  }

  @Get('ctp/by-storage')
  async ctpByStorage(
    @CurrentCompany() companyId: string,
    @Query() query: CtpByStorageQueryDto,
  ) {
    return this.recipeCtpService.computeByStorageForVariant(
      companyId,
      query.variantId,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Post()
  async create(@CurrentCompany() companyId: string, @Body() dto: CreateRecipeDto) {
    return this.recipesService.create(companyId, dto);
  }

  @Put(':id')
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(companyId, id, dto);
  }
}

