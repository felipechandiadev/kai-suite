import { BadRequestException } from '@nestjs/common';
import {
  activityRequiresOverrides,
  getActivityByCode,
  getCommuneByCode,
  getRegionByCode,
  normalizeActiveEconomicActivities,
} from '@kai/chile-catalogs';
import type { PersonEconomicActivity } from '../domain/person.entity';

export type PersonGeoActivityInput = {
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  activityStarted?: boolean;
  economicActivities?: PersonEconomicActivity[] | null;
};

export function sanitizePersonGeoActivityFields(
  input: PersonGeoActivityInput,
): PersonGeoActivityInput {
  const out: PersonGeoActivityInput = {};

  if (input.regionCode !== undefined) {
    const code = input.regionCode?.trim() || null;
    if (code) {
      const region = getRegionByCode(code);
      if (!region) {
        throw new BadRequestException(`Región inválida: ${code}`);
      }
      out.regionCode = region.code;
      out.regionName = input.regionName?.trim() || region.name;
    } else {
      out.regionCode = null;
      out.regionName = null;
    }
  }

  if (input.communeCode !== undefined) {
    const code = input.communeCode?.trim() || null;
    if (code) {
      const commune = getCommuneByCode(code);
      if (!commune) {
        throw new BadRequestException(`Comuna inválida: ${code}`);
      }
      const regionCodeForCheck =
        (out.regionCode ?? input.regionCode?.trim() ?? null) || null;
      if (regionCodeForCheck && commune.regionCode !== regionCodeForCheck) {
        throw new BadRequestException(
          'La comuna no pertenece a la región seleccionada.',
        );
      }
      out.communeCode = commune.communeCode;
      out.communeName = input.communeName?.trim() || commune.name;
      out.treasuryCode = input.treasuryCode?.trim() || commune.treasuryCode;
      if (!out.regionCode && input.regionCode === undefined) {
        out.regionCode = commune.regionCode;
        const region = getRegionByCode(commune.regionCode);
        out.regionName = input.regionName?.trim() || region?.name || null;
      }
    } else {
      out.communeCode = null;
      out.communeName = null;
      out.treasuryCode = null;
    }
  }

  if (input.activityStarted !== undefined) {
    out.activityStarted = input.activityStarted === true;
    if (!out.activityStarted) {
      out.economicActivities = null;
      return out;
    }
  }

  if (input.economicActivities !== undefined) {
    if (input.economicActivities == null) {
      out.economicActivities = null;
    } else {
      const normalized = normalizeActiveEconomicActivities(
        input.economicActivities.map((raw) => {
          const code = String(raw.code ?? '').trim();
          if (!code) {
            throw new BadRequestException('Actividad económica sin código.');
          }
          const catalog = getActivityByCode(code);
          const name =
            String(raw.name ?? '').trim() || catalog?.name || code;
          const category = raw.category;
          const ivaAffected = raw.ivaAffected;
          if (category !== 'PRIMERA' && category !== 'SEGUNDA') {
            throw new BadRequestException(
              `Categoría inválida para actividad ${code}.`,
            );
          }
          if (typeof ivaAffected !== 'boolean') {
            throw new BadRequestException(
              `Debe indicar si la actividad ${code} afecta IVA.`,
            );
          }
          if (catalog && !activityRequiresOverrides(code)) {
            if (
              catalog.category != null &&
              ((catalog.category === 1 && category !== 'PRIMERA') ||
                (catalog.category === 2 && category !== 'SEGUNDA'))
            ) {
              throw new BadRequestException(
                `La categoría de ${code} no coincide con el catálogo SII.`,
              );
            }
            if (
              catalog.ivaAffected != null &&
              catalog.ivaAffected !== ivaAffected
            ) {
              throw new BadRequestException(
                `El afecto a IVA de ${code} no coincide con el catálogo SII.`,
              );
            }
          }
          return {
            code,
            name,
            category,
            ivaAffected,
            isActive: Boolean(raw.isActive),
          };
        }),
      );
      out.economicActivities = normalized;
    }
  }

  if (
    input.activityStarted === undefined &&
    out.economicActivities != null &&
    out.economicActivities.length > 0
  ) {
    out.activityStarted = true;
  }

  return out;
}
