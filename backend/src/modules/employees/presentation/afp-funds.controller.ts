import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AfpFundsService } from '../application/afp-funds.service';

@Controller('hr/afp-funds')
export class AfpFundsController {
  constructor(private readonly service: AfpFundsService) {}

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

  @Get(':id')
  async get(@Param('id') id: string) {
    return {
      success: true,
      data: await this.wrap(() => this.service.get(id)),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      contributionPercent: string;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.create(body)),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      contributionPercent?: string;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.wrap(() => this.service.update(id, body)),
    };
  }
}
