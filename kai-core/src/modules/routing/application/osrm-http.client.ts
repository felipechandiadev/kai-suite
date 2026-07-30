import { Injectable, Logger } from '@nestjs/common';

export type OsrmTripResult = {
  orderedWaypointIndexes: number[];
  distanceM: number;
  durationS: number;
  geometry: Record<string, unknown>;
};

@Injectable()
export class OsrmHttpClient {
  private readonly logger = new Logger(OsrmHttpClient.name);

  async trip(
    coords: Array<{ lng: number; lat: number }>,
    baseUrl?: string | null,
  ): Promise<OsrmTripResult | null> {
    if (coords.length < 2) return null;
    const urlBase = (baseUrl || process.env.OSRM_URL || 'http://localhost:5001').replace(/\/$/, '');
    const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${urlBase}/trip/v1/driving/${coordStr}?source=first&roundtrip=false&geometries=geojson&overview=full`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`OSRM trip failed: ${res.status}`);
        return null;
      }
      const body = (await res.json()) as {
        trips?: Array<{ distance: number; duration: number; geometry: Record<string, unknown> }>;
        waypoints?: Array<{ waypoint_index: number }>;
      };
      const trip = body.trips?.[0];
      if (!trip || !body.waypoints) return null;
      return {
        orderedWaypointIndexes: body.waypoints.map((w) => w.waypoint_index),
        distanceM: Math.round(trip.distance),
        durationS: Math.round(trip.duration),
        geometry: trip.geometry,
      };
    } catch (err) {
      this.logger.warn(`OSRM unavailable: ${String(err)}`);
      return null;
    }
  }
}
