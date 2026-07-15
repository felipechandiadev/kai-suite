import { buildNearestNeighborRoutePlan, haversineMeters } from '../../application/route-plan.util';

describe('route-plan.util', () => {
  it('haversineMeters returns positive distance', () => {
    const d = haversineMeters(
      { lat: -36.13, lng: -71.82 },
      { lat: -36.14, lng: -71.83 },
    );
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(5000);
  });

  it('buildNearestNeighborRoutePlan orders stops and builds geometry', () => {
    const depot = { lat: -36.1315, lng: -71.8188 };
    const plan = buildNearestNeighborRoutePlan(depot, [
      {
        deliveryOrderId: 'o-far',
        transactionId: 't-far',
        lat: -36.145,
        lng: -71.832,
      },
      {
        deliveryOrderId: 'o-near',
        transactionId: 't-near',
        lat: -36.138,
        lng: -71.819,
      },
    ]);

    expect(plan.stops).toHaveLength(2);
    expect(plan.stops[0]?.deliveryOrderId).toBe('o-near');
    expect(plan.totalDistanceM).toBeGreaterThan(0);
    expect(plan.totalDurationS).toBeGreaterThan(0);
    expect(plan.routeGeometry.coordinates.length).toBeGreaterThanOrEqual(3);
  });
});
