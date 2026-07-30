import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  activityRequiresOverrides,
  getActivityByCode,
} from '@kai/chile-catalogs';
import { isValidChileRut, parseChileRut } from '../infrastructure/chile-rut.util';
import { SiiStcHttpClient } from '../infrastructure/sii-stc-http.client';
import type { ParsedSiiStcActivity } from '../infrastructure/sii-stc-html.parser';
import type {
  SiiTaxStatusActivityReadModel,
  SiiTaxStatusReadModel,
} from './read-models/sii-tax-status.read-model';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SiiTaxStatusService {
  private readonly cache = new Map<string, { expiresAt: number; data: SiiTaxStatusReadModel }>();

  constructor(private readonly siiClient: SiiStcHttpClient) {}

  private cacheKey(rut: string): string {
    const parsed = parseChileRut(rut);
    return parsed ? `${parsed.body}-${parsed.dv}` : rut.trim();
  }

  private mapCategory(raw: string, code: string): 'PRIMERA' | 'SEGUNDA' {
    const u = raw.trim().toUpperCase();
    if (u.startsWith('SEGUNDA') || u === '2') return 'SEGUNDA';
    if (u.startsWith('PRIMERA') || u === '1') return 'PRIMERA';
    const catalog = getActivityByCode(code);
    if (catalog?.category === 2) return 'SEGUNDA';
    return 'PRIMERA';
  }

  private mapActivity(item: ParsedSiiStcActivity): SiiTaxStatusActivityReadModel {
    const code = item.code.padStart(6, '0');
    const catalog = getActivityByCode(code);
    return {
      code,
      name: catalog?.name ?? item.name,
      category: this.mapCategory(item.categoryRaw, code),
      ivaAffected:
        catalog?.ivaAffected != null ? catalog.ivaAffected : item.ivaAffected,
      requiresOverrides: activityRequiresOverrides(code),
    };
  }

  async lookup(rutInput: string): Promise<SiiTaxStatusReadModel> {
    if (!isValidChileRut(rutInput)) {
      throw new BadRequestException('RUT inválido');
    }
    const key = this.cacheKey(rutInput);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const parsed = await this.siiClient.lookupByRut(rutInput);
      const rutFormatted = parseChileRut(rutInput)?.formatted ?? rutInput.trim();
      const data: SiiTaxStatusReadModel = {
        rut: rutFormatted,
        legalName: parsed.legalName,
        activityStarted: parsed.activityStarted,
        activityStartDate: parsed.activityStartDate,
        smallBusiness: parsed.smallBusiness,
        foreignCurrencyAuth: parsed.foreignCurrencyAuth,
        economicActivities: parsed.activities.map((a) => this.mapActivity(a)),
        warnings: parsed.warnings,
        fetchedAt: new Date().toISOString(),
      };
      this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al consultar el SII';
      if (message.includes('inválido') || message.includes('no registrado')) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(message);
    }
  }
}
