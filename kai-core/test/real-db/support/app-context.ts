import { INestApplicationContext } from '@nestjs/common';
import { createScratchDb, ScratchDb } from './scratch-db';

export interface RealDbContext {
  db: ScratchDb;
  app: INestApplicationContext;
  close(): Promise<void>;
}

/**
 * Clona la BD, apunta el entorno a la copia, aplica migraciones pendientes
 * y levanta el contexto de Nest (sin HTTP). Los escenarios obtienen servicios con `app.get(...)`.
 */
export async function bootRealDb(): Promise<RealDbContext> {
  const db = createScratchDb();
  process.env.DB_DATABASE = db.name;
  process.env.DB_SYNCHRONIZE = 'false';

  // Import tardío: la config lee process.env al cargarse.
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../../../src/app.module');
  const { AppDataSource } = await import('../../../src/config/data-source');

  const ds = await AppDataSource.initialize();
  try {
    await ds.runMigrations({ transaction: 'each' });
  } finally {
    await ds.destroy();
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  return {
    db,
    app,
    async close() {
      try {
        await app.close();
      } catch {
        // Redis puede cerrarse antes (ClientClosedError): no es relevante para la prueba.
      }
      db.drop();
    },
  };
}
