import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteCommerceService } from '../application/lite-commerce.service';
import { LitePosSaleDto } from '../application/dto/lite-pos-sale.dto';
import { LiteCompanyResolver } from '../application/lite-company.resolver';

@ApiTags('Lite')
@ApiBearerAuth('JWT-auth')
@SkipTenant()
@Controller('lite/pos')
export class LitePosController {
  constructor(
    private readonly commerce: LiteCommerceService,
    private readonly companies: LiteCompanyResolver,
  ) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Lite POS sellable catalog' })
  async posCatalog(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listPosCatalog(companyId);
  }

  @Post('sale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite POS sale (decrements PHYSICAL stock)' })
  async sale(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LitePosSaleDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.commerce.createPosSale(ctx.companyId, ctx.userId, dto);
  }
}
