import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { CategoryServiceAdapter } from '../application/category.service.adapter';
import { CategoryWithCountsDto } from '../application/dto/category-with-counts.dto';
import { CreateCategoryDto } from '../application/dto/create-category.dto';
import { UpdateCategoryDto } from '../application/dto/update-category.dto';
import { ListCategoriesDto } from '../application/dto/list-categories.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryServiceAdapter) {}

  @Get()
  async findAll(@Query() query: ListCategoriesDto) {
    return this.categoryService.findAll(query);
  }

  @Get('with-counts')
  async getCategoriesWithCounts(): Promise<CategoryWithCountsDto[]> {
    return this.categoryService.getCategoriesWithCounts();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return { success: true };
  }
}
