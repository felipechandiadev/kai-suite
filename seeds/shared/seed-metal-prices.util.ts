import type { Repository } from 'typeorm';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import type { SeedMetalPriceDef } from '../joyarte/seed-joyarte-metal-prices';

function latestPerMetal(rows: readonly SeedMetalPriceDef[]): Map<string, number> {
  const latest = new Map<string, { date: string; valueCLP: number }>();
  for (const def of rows) {
    const cur = latest.get(def.metal);
    if (!cur || def.date >= cur.date) {
      latest.set(def.metal, { date: def.date, valueCLP: def.valueCLP });
    }
  }
  return new Map([...latest.entries()].map(([metal, v]) => [metal, v.valueCLP]));
}

export async function seedMetalPricesFromDefs(params: {
  metalPriceRepo: Repository<MetalPrice>;
  companyId: string;
  rows: readonly SeedMetalPriceDef[];
  logLabel: string;
}): Promise<void> {
  const { metalPriceRepo, companyId, rows, logLabel } = params;

  await metalPriceRepo.delete({ companyId });

  for (const def of rows) {
    await metalPriceRepo.save(
      metalPriceRepo.create({
        companyId,
        metal: def.metal,
        date: new Date(`${def.date}T12:00:00.000Z`),
        valueCLP: def.valueCLP,
        notes: def.notes,
      }),
    );
  }

  const latestByMetal = latestPerMetal(rows);
  const summary = [...latestByMetal.entries()]
    .map(([metal, clp]) => `${metal} $${clp.toLocaleString('es-CL')}/g`)
    .join(', ');

  console.log(
    `✅ Precios de metales ${logLabel}: ${rows.length} registro(s). Vigentes: ${summary}`,
  );
}
