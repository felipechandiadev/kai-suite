import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { MenuService } from '../application/menu.service';
import { CreateHeroSlideDto } from '../application/dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from '../application/dto/update-hero-slide.dto';

@Controller('menu/admin')
export class MenuAdminController {
  constructor(private readonly menuService: MenuService) {}

  @Get('hero-slider-settings')
  getHeroSliderSettings(@CurrentCompany() companyId: string) {
    return this.menuService.getHeroSliderSettingsAdmin(companyId);
  }

  @Put('hero-slider-settings')
  updateHeroSliderSettings(
    @CurrentCompany() companyId: string,
    @Body() body: { autoplaySeconds: number },
  ) {
    return this.menuService.updateHeroSliderAutoplaySeconds(
      companyId,
      body.autoplaySeconds,
    );
  }

  @Get('hero-slides')
  listHeroSlides(@CurrentCompany() companyId: string) {
    return this.menuService.listHeroSlidesAdmin(companyId);
  }

  @Post('hero-slides')
  createHeroSlide(
    @CurrentCompany() companyId: string,
    @Body() body: CreateHeroSlideDto,
  ) {
    return this.menuService.createHeroSlide(companyId, body);
  }

  @Put('hero-slides/order')
  reorderHeroSlides(
    @CurrentCompany() companyId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.menuService.reorderHeroSlides(
      companyId,
      body.orderedIds ?? [],
    );
  }

  @Patch('hero-slides/:id')
  updateHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateHeroSlideDto,
  ) {
    return this.menuService.updateHeroSlide(companyId, id, body);
  }

  @Delete('hero-slides/:id')
  deleteHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.menuService.deleteHeroSlide(companyId, id);
  }
}
