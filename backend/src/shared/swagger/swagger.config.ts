import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';

/**
 * Configure Swagger/OpenAPI documentation
 */
export function setupSwagger(
  app: INestApplication,
  configService: AppConfigService,
) {
  // Only setup Swagger if enabled in configuration
  if (!configService.app.features.enableSwagger) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Kai Platform API')
    .setDescription(
      'API documentation for Kai Platform — KaiStore / KaiFood enterprise POS',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('Companies', 'Company management')
    .addTag('Branches', 'Branch management')
    .addTag('Products', 'Product catalog management')
    .addTag('Transactions', 'Transaction processing and management')
    .addTag('Customers', 'Customer management')
    .addTag('Suppliers', 'Supplier management')
    .addTag('Inventory', 'Inventory management')
    .addTag('Accounting', 'Accounting and financial operations')
    .addTag('Reports', 'Reporting and analytics')
    .addServer(
      `http://localhost:${configService.app.port}`,
      'Development server',
    )
    .addServer('https://api.flowstore.com', 'Production server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI
  SwaggerModule.setup(`${configService.app.apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customSiteTitle: 'Kai Platform API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b4151 }
    `,
    customfavIcon: '/favicon.ico',
  });
}
