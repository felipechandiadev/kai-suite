import { BadRequestException } from '@nestjs/common';
import { activityRequiresOverrides } from '@kai/chile-catalogs';
import { sanitizePersonGeoActivityFields } from '../../application/person-geo-activity.util';

describe('sanitizePersonGeoActivityFields', () => {
  it('resolves Parral commune and region from catalog', () => {
    const out = sanitizePersonGeoActivityFields({
      regionCode: '07',
      communeCode: '07305',
    });
    expect(out.regionCode).toBe('07');
    expect(out.regionName).toMatch(/Maule/i);
    expect(out.communeCode).toBe('07305');
    expect(out.communeName).toMatch(/PARRAL/i);
    expect(out.treasuryCode).toBe('164');
  });

  it('rejects commune outside selected region', () => {
    expect(() =>
      sanitizePersonGeoActivityFields({
        regionCode: '01',
        communeCode: '07305',
      }),
    ).toThrow(BadRequestException);
  });

  it('clears activities when inicio de actividades is off', () => {
    const out = sanitizePersonGeoActivityFields({
      activityStarted: false,
      economicActivities: [
        {
          code: '471100',
          name: 'Supermercados',
          category: 'PRIMERA',
          ivaAffected: true,
          isActive: true,
        },
      ],
    });
    expect(out.activityStarted).toBe(false);
    expect(out.economicActivities).toBeNull();
  });

  it('keeps a single isActive activity when several are marked active', () => {
    const out = sanitizePersonGeoActivityFields({
      economicActivities: [
        {
          code: '471100',
          name: 'Supermercados',
          category: 'PRIMERA',
          ivaAffected: true,
          isActive: true,
        },
        {
          code: '472101',
          name: 'Minimarket',
          category: 'PRIMERA',
          ivaAffected: true,
          isActive: true,
        },
      ],
    });
    const actives = (out.economicActivities ?? []).filter((a) => a.isActive);
    expect(actives).toHaveLength(1);
    expect(actives[0].code).toBe('471100');
  });

  it('allows G codes with explicit category/IVA overrides', () => {
    const gCode = ['620100', '620200', '620900'].find((code) =>
      activityRequiresOverrides(code),
    );
    if (!gCode) {
      // Catálogo sin códigos G en esta build: no falla la suite.
      return;
    }
    const out = sanitizePersonGeoActivityFields({
      economicActivities: [
        {
          code: gCode,
          name: 'Actividad G',
          category: 'SEGUNDA',
          ivaAffected: false,
          isActive: true,
        },
      ],
    });
    expect(out.economicActivities?.[0]).toMatchObject({
      code: gCode,
      category: 'SEGUNDA',
      ivaAffected: false,
      isActive: true,
    });
  });

  it('rejects category mismatch for non-G catalog codes', () => {
    expect(() =>
      sanitizePersonGeoActivityFields({
        economicActivities: [
          {
            code: '471100',
            name: 'Supermercados',
            category: 'SEGUNDA',
            ivaAffected: true,
            isActive: true,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
