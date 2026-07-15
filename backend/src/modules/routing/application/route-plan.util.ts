export type RouteCoordinate = { lat: number; lng: number };

export type RouteStopInput = RouteCoordinate & {
  deliveryOrderId: string;
  transactionId: string;
};

export type RoutePlan = {
  stops: Array<RouteStopInput & { sequence: number }>;
  totalDistanceM: number;
  totalDurationS: number;
  routeGeometry: { type: 'LineString'; coordinates: [number, number][] };
};

const EARTH_RADIUS_M = 6_371_000;
/** Velocidad urbana estimada para fallback sin OSRM (m/s). */
const FALLBACK_SPEED_MPS = 25 / 3.6;
/** Tiempo fijo por parada (segundos). */
const SECONDS_PER_STOP = 180;

export function haversineMeters(a: RouteCoordinate, b: RouteCoordinate): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Ordena paradas por vecino más cercano desde la bodega (fallback sin OSRM). */
export function buildNearestNeighborRoutePlan(
  depot: RouteCoordinate,
  orders: RouteStopInput[],
): RoutePlan {
  const remaining = [...orders];
  const ordered: RouteStopInput[] = [];
  let current = depot;
  let totalDistanceM = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = haversineMeters(current, remaining[0]!);
    for (let i = 1; i < remaining.length; i += 1) {
      const dist = haversineMeters(current, remaining[i]!);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    totalDistanceM += bestDist;
    current = next;
  }

  const path: RouteCoordinate[] = [depot, ...ordered];
  const driveSeconds = Math.round(totalDistanceM / FALLBACK_SPEED_MPS);
  const stopSeconds = ordered.length * SECONDS_PER_STOP;

  return {
    stops: ordered.map((order, idx) => ({
      ...order,
      sequence: idx + 1,
    })),
    totalDistanceM: Math.round(totalDistanceM),
    totalDurationS: driveSeconds + stopSeconds,
    routeGeometry: {
      type: 'LineString',
      coordinates: path.map((p) => [p.lng, p.lat]),
    },
  };
}
