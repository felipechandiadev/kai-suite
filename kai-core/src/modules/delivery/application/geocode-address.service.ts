import { Injectable, Logger } from '@nestjs/common';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  commune: string | null;
  region: string | null;
};

@Injectable()
export class GeocodeAddressService {
  private readonly logger = new Logger(GeocodeAddressService.name);

  async geocode(address: string, commune?: string, region?: string): Promise<GeocodeResult | null> {
    const q = [address, commune, region, 'Chile'].filter(Boolean).join(', ');
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'cl');

    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'KaiStore/1.0 (delivery)' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: Record<string, string>;
      }>;
      const first = data[0];
      if (!first) return null;
      return {
        latitude: Number(first.lat),
        longitude: Number(first.lon),
        displayName: first.display_name,
        commune:
          first.address?.city ||
          first.address?.town ||
          first.address?.village ||
          first.address?.municipality ||
          commune ||
          null,
        region: first.address?.state || region || null,
      };
    } catch (err) {
      this.logger.warn(`Geocode failed: ${String(err)}`);
      return null;
    }
  }
}
