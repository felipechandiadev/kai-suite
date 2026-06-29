import { MetalType } from '@modules/metal-prices/domain/metal.enum';

export type SeedMetalPriceDef = {
  metal: MetalType;
  /** Fecha ISO `YYYY-MM-DD` (día de cotización). */
  date: string;
  /** CLP por gramo. */
  valueCLP: number;
  notes?: string;
};

/**
 * Histórico demo para Joyarte — calculadora joyería y pantalla Precios de metales.
 * Valores ficticios pero coherentes (tendencia alcista suave 2025–2026).
 */
export const SEED_JOYARTE_METAL_PRICES: readonly SeedMetalPriceDef[] = [
  // Oro 18K — metal principal del catálogo
  { metal: MetalType.ORO_18K, date: '2025-09-01', valueCLP: 78_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2025-10-01', valueCLP: 80_500, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2025-11-01', valueCLP: 82_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2025-12-01', valueCLP: 84_500, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-01-01', valueCLP: 86_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-02-01', valueCLP: 87_500, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-03-01', valueCLP: 88_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-04-01', valueCLP: 89_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-05-01', valueCLP: 90_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_18K, date: '2026-06-01', valueCLP: 90_000, notes: 'Cotización vigente seed' },
  // Oro 24K
  { metal: MetalType.ORO_24K, date: '2026-01-01', valueCLP: 98_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_24K, date: '2026-03-01', valueCLP: 100_500, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_24K, date: '2026-06-01', valueCLP: 102_000, notes: 'Seed Joyarte' },
  // Oro 14K
  { metal: MetalType.ORO_14K, date: '2026-03-01', valueCLP: 68_000, notes: 'Seed Joyarte' },
  { metal: MetalType.ORO_14K, date: '2026-06-01', valueCLP: 69_500, notes: 'Seed Joyarte' },
  // Plata 925
  { metal: MetalType.PLATA_925, date: '2025-12-01', valueCLP: 1_050, notes: 'Seed Joyarte' },
  { metal: MetalType.PLATA_925, date: '2026-02-01', valueCLP: 1_120, notes: 'Seed Joyarte' },
  { metal: MetalType.PLATA_925, date: '2026-04-01', valueCLP: 1_180, notes: 'Seed Joyarte' },
  { metal: MetalType.PLATA_925, date: '2026-06-01', valueCLP: 1_200, notes: 'Seed Joyarte' },
  // Plata 950
  { metal: MetalType.PLATA_950, date: '2026-06-01', valueCLP: 1_250, notes: 'Seed Joyarte' },
  // Platino
  { metal: MetalType.PLATINO, date: '2026-04-01', valueCLP: 42_000, notes: 'Seed Joyarte' },
  { metal: MetalType.PLATINO, date: '2026-06-01', valueCLP: 43_500, notes: 'Seed Joyarte' },
];
