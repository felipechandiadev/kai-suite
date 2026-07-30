import { OsrmHttpClient } from '../../application/osrm-http.client';

describe('OsrmHttpClient', () => {
  const client = new OsrmHttpClient();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns null when fewer than 2 coordinates', async () => {
    await expect(client.trip([{ lng: -71.6, lat: -35.4 }])).resolves.toBeNull();
  });

  it('returns trip result on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        trips: [{ distance: 1200, duration: 300, geometry: { type: 'LineString', coordinates: [] } }],
        waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }],
      }),
    } as Response);

    const result = await client.trip(
      [
        { lng: -71.6, lat: -35.4 },
        { lng: -71.5, lat: -35.3 },
      ],
      'http://osrm.test',
    );

    expect(result).toEqual({
      orderedWaypointIndexes: [0, 1],
      distanceM: 1200,
      durationS: 300,
      geometry: { type: 'LineString', coordinates: [] },
    });
  });

  it('returns null when OSRM responds with error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const result = await client.trip(
      [
        { lng: -71.6, lat: -35.4 },
        { lng: -71.5, lat: -35.3 },
      ],
    );
    expect(result).toBeNull();
  });
});
