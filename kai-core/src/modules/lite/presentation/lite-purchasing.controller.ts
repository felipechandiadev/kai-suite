import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteCommerceService } from '../application/lite-commerce.service';
import { LiteReceptionDto } from '../application/dto/lite-reception.dto';
import { LiteCompanyResolver } from '../application/lite-company.resolver';

@ApiTags('Lite')
@ApiBearerAuth('JWT-auth')
@SkipTenant()
@Controller('lite/purchasing')
export class LitePurchasingController {
  constructor(
    private readonly commerce: LiteCommerceService,
    private readonly companies: LiteCompanyResolver,
  ) {}

  @Get('receptions')
  @ApiOperation({ summary: 'Lite receptions list' })
  async listReceptions(@Headers('authorization') auth?: string) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.listReceptions(companyId);
  }

  @Post('receptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lite goods reception (increments stock)' })
  async reception(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteReceptionDto,
  ) {
    const companyId = await this.companies.fromBearer(auth);
    return this.commerce.createReception(companyId, dto);
  }
}
