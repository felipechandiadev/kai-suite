import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../application/health.service';
import { SkipTenant } from '@common/tenant';

@ApiTags('Health')
@SkipTenant()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the application is running and healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 123.45 },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number', example: 104857600 },
            total: { type: 'number', example: 1073741824 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  check() {
    return this.healthService.check();
  }

  @Get('db')
  @ApiOperation({
    summary: 'Database health check',
    description: 'Check if the database connection is working',
  })
  @ApiResponse({
    status: 200,
    description: 'Database connection is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Database connection failed' })
  checkDatabase() {
    return this.healthService.checkDatabase();
  }
}
