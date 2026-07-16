import { describe, expect, it } from 'vitest';
import {
  activityRequiresOverrides,
  getActivityByCode,
  getCommuneByCode,
  listCommunesByRegion,
  listRegions,
  normalizeActiveEconomicActivities,
  searchCommunes,
  searchEconomicActivities,
} from './index';

describe('@kai/chile-catalogs', () => {
  it('lists regions and filters communes by region', () => {
    const regions = listRegions();
    expect(regions.length).toBeGreaterThanOrEqual(10);
    const maule = listCommunesByRegion('07');
    expect(maule.some((c) => c.communeCode === '07305')).toBe(true);
    expect(getCommuneByCode('07305')?.name).toMatch(/PARRAL/i);
  });

  it('searches communes within region', () => {
    const hits = searchCommunes('parral', '07');
    expect(hits.some((c) => c.communeCode === '07305')).toBe(true);
    expect(searchCommunes('parral', '01').length).toBe(0);
  });

  it('searches economic activities and detects G overrides', () => {
    expect(searchEconomicActivities('trigo').length).toBeGreaterThan(0);
    const trigo = getActivityByCode('011101');
    expect(trigo?.ivaAffected).toBe(true);
    expect(trigo?.category).toBe(1);
    // Known G codes from SII catalog
    const g = getActivityByCode('620100');
    if (g) {
      expect(activityRequiresOverrides('620100')).toBe(
        g.category == null || g.ivaAffected == null,
      );
    }
  });

  it('normalizes at most one active activity', () => {
    const next = normalizeActiveEconomicActivities([
      {
        code: 'A',
        name: 'A',
        category: 'PRIMERA',
        ivaAffected: true,
        isActive: true,
      },
      {
        code: 'B',
        name: 'B',
        category: 'SEGUNDA',
        ivaAffected: false,
        isActive: true,
      },
    ]);
    expect(next.filter((x) => x.isActive)).toHaveLength(1);
    expect(next[0].isActive).toBe(true);
    expect(next[1].isActive).toBe(false);
  });
});
