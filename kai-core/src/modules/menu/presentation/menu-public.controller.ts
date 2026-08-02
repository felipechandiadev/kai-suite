import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { MenuService } from '../application/menu.service';
import { MenuStoreGuard } from './menu-store.guard';
import { MenuStore } from './menu-store.decorator';
import type { MenuStoreContext } from '../application/menu-store.context';

@Controller('menu')
@SkipTenant()
@UseGuards(MenuStoreGuard)
export class MenuPublicController {
  constructor(private readonly menuService: MenuService) {}

  @Get('storefront')
  getStorefront(@MenuStore() store: MenuStoreContext) {
    return this.menuService.getStorefront(store);
  }

  @Get('catalog')
  listCatalog(
    @MenuStore() store: MenuStoreContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string | string[],
    @Query('categoryIds') categoryIds?: string | string[],
  ) {
    const normalizeIds = (raw?: string | string[]): string[] => {
      if (raw == null) return [];
      const parts = Array.isArray(raw) ? raw : [raw];
      return parts
        .flatMap((p) => String(p).split(','))
        .map((s) => s.trim())
        .filter(Boolean);
    };
    return this.menuService.listCatalog(store, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      categoryIds: [...normalizeIds(categoryIds), ...normalizeIds(categoryId)],
    });
  }

  @Get('products/:productId')
  getProduct(
    @MenuStore() store: MenuStoreContext,
    @Param('productId') productId: string,
  ) {
    return this.menuService.getProduct(store, productId);
  }

  @Get('categories')
  listCategories(@MenuStore() store: MenuStoreContext) {
    return this.menuService.listCategories(store);
  }
}
