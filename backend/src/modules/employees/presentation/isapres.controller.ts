import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IsapresService } from '../application/isapres.service';

@Controller('hr/isapres')
export class IsapresController {
  constructor(private readonly service: IsapresService) {}

  private wrap<T>(fn: () => Promise<T>) {
    return fn().catch((error) => {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : 'Error';
      const status = msg.toLowerCase().includes('no encontrad')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException({ success: false, message: msg }, status);
    });
  }

  @Get()
  async list(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return {
      success: true,
      data: await this.wrap(() => this.service.list(include)),
    };
  }
}
