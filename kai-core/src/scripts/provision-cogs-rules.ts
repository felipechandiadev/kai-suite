#!/usr/bin/env ts-node
/**
 * Crea las reglas contables de costo de ventas (idempotente).
 * Uso: cd kai-core && npm run accounting:provision-cogs -- [--company <uuid>] [--dry-run]
 * Sin --company procesa todas las compañías.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { CogsRulesProvisionerService } from '../modules/accounting-rules/application/cogs-rules-provisioner.service';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const dataSource = app.get(DataSource);
    const provisioner = app.get(CogsRulesProvisionerService);
    const dryRun = process.argv.includes('--dry-run');
    const only = arg('--company');
    const companies: Array<{ id: string }> = only
      ? [{ id: only }]
      : await dataSource.query('SELECT id FROM companies');
    for (const c of companies) {
      const r = await provisioner.provision(c.id, { dryRun });
      console.log(JSON.stringify(r, null, 2));
    }
  } finally {
    try {
      await app.close();
    } catch {
      // El adaptador de Redis puede fallar al cerrar un contexto sin servidor; no afecta el resultado.
    }
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
