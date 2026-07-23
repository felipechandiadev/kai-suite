import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/logging/logging.interceptor';
import { MetricsInterceptor } from './shared/metrics/metrics.interceptor';
import { setupSwagger } from './shared/swagger/swagger.config';
import {
  buildCorsOriginOption,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  resolveCorsAllowOriginHeader,
} from './config/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(AppConfigService);

  const corsOrigin = buildCorsOriginOption(
    configService.app.cors.origin,
    configService.app.cors.credentials,
  );

  // CORS: preflight OPTIONS debe responder antes del router de Nest (evita 404 en rutas solo-GET).
  if (configService.app.features.enableCors) {
    const expressApp = app.getHttpAdapter().getInstance() as {
      use: (
        fn: (
          req: { method?: string; headers?: Record<string, string | string[] | undefined> },
          res: {
            status: (code: number) => { end: (chunk?: string) => void };
            setHeader: (name: string, value: string) => void;
          },
          next: () => void,
        ) => void,
      ) => void;
    };
    expressApp.use((req, res, next) => {
      if (req.method !== 'OPTIONS') {
        return next();
      }
      const reqOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '';
      const allowOrigin = resolveCorsAllowOriginHeader(
        configService.app.cors.origin,
        configService.app.cors.credentials,
        reqOrigin,
      );
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      if (configService.app.cors.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS);
      res.setHeader('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS);
      res.setHeader('Access-Control-Max-Age', '86400');
      // Chrome Private Network Access (localhost ↔ 127.0.0.1 / LAN)
      if (req.headers?.['access-control-request-private-network'] === 'true') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
      }
      return res.status(204).end();
    });
  }

  // CORS Configuration (acepta cualquier origen cuando CORS_ORIGIN=* o all)
  if (configService.app.features.enableCors) {
    app.enableCors({
      origin: corsOrigin,
      methods: CORS_ALLOWED_METHODS,
      credentials: configService.app.cors.credentials,
      allowedHeaders: CORS_ALLOWED_HEADERS.split(','),
    });
  }

  // Set global prefix for all routes
  app.setGlobalPrefix(configService.app.apiPrefix);

  // Validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Exception filter global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Errores HTTP y slow requests (sin log línea a línea de cada ruta)
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  // Metrics interceptor global
  const metricsInterceptor = app.get(MetricsInterceptor);
  app.useGlobalInterceptors(metricsInterceptor);

  // Setup Swagger/OpenAPI documentation
  setupSwagger(app, configService);

  const port = configService.app.port;
  // `::` dual-stack: browsers resuelven `localhost` → ::1; si solo oímos 0.0.0.0 el WS falla.
  await app.listen(port, '::');
}

bootstrap();
