import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SkipTenant } from '@common/tenant';
function readBackendVersion(): string {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return process.env.APP_VERSION ?? '0.0.0';
  }
}

@ApiTags('Lite')
@SkipTenant()
@Controller('lite')
export class LiteHealthController {
  @Get('health')
  @ApiOperation({ summary: 'Kai Core Lite health' })
  health() {
    return {
      ok: true,
      edition: 'lite' as const,
      version: readBackendVersion(),
      product: process.env.KAI_PRODUCT ?? 'kaistore',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
