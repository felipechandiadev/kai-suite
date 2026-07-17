import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { RecipesService } from '../application/recipes.service';
import { CreateRecipeDto } from '../application/dto/create-recipe.dto';
import { UpdateRecipeDto } from '../application/dto/update-recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async list(
    @CurrentCompany() companyId: string,
    @Query('outputVariantId') outputVariantId?: string,
  ) {
    return this.recipesService.list(companyId, outputVariantId);
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

