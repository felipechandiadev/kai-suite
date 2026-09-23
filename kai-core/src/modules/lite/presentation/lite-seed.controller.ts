import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenant } from '@common/tenant';
import { LiteSeedService } from '../application/lite-seed.service';

@ApiTags('Lite')
@SkipTenant()
@Controller('lite')
export class LiteSeedController {
  constructor(private readonly liteSeed: LiteSeedService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Minimal seed for Kai Core Lite (admin + company)' })
  seed() {
    return this.liteSeed.runMinimalSeed();
  }
}
