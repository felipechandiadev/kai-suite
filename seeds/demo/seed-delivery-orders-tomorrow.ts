#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import {
  seedDeliveryOrdersForDate,
  tomorrowIsoSantiago,
} from './seed-delivery-orders-for-date';

async function bootstrap() {
  const argDate = process.argv[2]?.trim();
  const targetDate =
    argDate && /^\d{4}-\d{2}-\d{2}$/.test(argDate) ? argDate : tomorrowIsoSantiago();
  const courierUserName = process.argv[3]?.trim() || 'delivery1';

  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    console.log(`📦 Sembrando pedidos de reparto para ${targetDate}…`);
    await seedDeliveryOrdersForDate({
      dataSource,
      targetDate,
      courierUserName,
    });
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
