import { Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteCommerceService } from '../application/lite-commerce.service';
import { LiteCompanyResolver } from '../application/lite-company.resolver';

@ApiTags('Lite')
@ApiBearerAuth('JWT-auth')
@SkipTenant()
@Controller('lite')
export class LiteCatalogController {
  constructor(
    private readonly commerce: LiteCommerceService,
    private readonly companies: LiteCompanyResolver,
  ) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Lite admin catalog (variants + product meta)' })
  async catalog(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listCatalog(companyId);
  }
}
