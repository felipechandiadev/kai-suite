export type DeliveryDispatchStatus =
  | 'planned'
  | 'route_ready'
  | 'out'
  | 'completed'
  | 'cancelled';

export type DeliveryStopStatus = 'pending' | 'visited' | 'skipped';

export type DeliveryOrderStatus =
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'READY_FOR_DISPATCH'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'ISSUE'
  | 'CANCELLED';

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties?: Record<string, unknown>;
    geometry: GeoJsonPolygon | { type: 'Point'; coordinates: number[] };
  }>;
};

export const MAULE_REGION_CODE = 'maule';
export const MAULE_REGION_NAME = 'Región del Maule';

/** Catálogo oficial Región del Maule (30 comunas). `code` = slug del nombre (sin acentos). */
export const MAULE_COMMUNES_SEED: Array<{
  code: string;
  name: string;
  province: string;
}> = [
  // Talca
  { code: 'talca', name: 'Talca', province: 'Talca' },
  { code: 'constitucion', name: 'Constitución', province: 'Talca' },
  { code: 'curepto', name: 'Curepto', province: 'Talca' },
  { code: 'empedrado', name: 'Empedrado', province: 'Talca' },
  { code: 'maule', name: 'Maule', province: 'Talca' },
  { code: 'pelarco', name: 'Pelarco', province: 'Talca' },
  { code: 'pencahue', name: 'Pencahue', province: 'Talca' },
  { code: 'rio-claro', name: 'Río Claro', province: 'Talca' },
  { code: 'san-clemente', name: 'San Clemente', province: 'Talca' },
  { code: 'san-rafael', name: 'San Rafael', province: 'Talca' },
  // Curicó
  { code: 'curico', name: 'Curicó', province: 'Curicó' },
  { code: 'hualane', name: 'Hualañé', province: 'Curicó' },
  { code: 'licanten', name: 'Licantén', province: 'Curicó' },
  { code: 'molina', name: 'Molina', province: 'Curicó' },
  { code: 'rauco', name: 'Rauco', province: 'Curicó' },
  { code: 'romeral', name: 'Romeral', province: 'Curicó' },
  { code: 'sagrada-familia', name: 'Sagrada Familia', province: 'Curicó' },
  { code: 'teno', name: 'Teno', province: 'Curicó' },
  { code: 'vichuquen', name: 'Vichuquén', province: 'Curicó' },
  // Linares
  { code: 'linares', name: 'Linares', province: 'Linares' },
  { code: 'colbun', name: 'Colbún', province: 'Linares' },
  { code: 'longavi', name: 'Longaví', province: 'Linares' },
  { code: 'parral', name: 'Parral', province: 'Linares' },
  { code: 'retiro', name: 'Retiro', province: 'Linares' },
  { code: 'san-javier', name: 'San Javier', province: 'Linares' },
  { code: 'villa-alegre', name: 'Villa Alegre', province: 'Linares' },
  { code: 'yerbas-buenas', name: 'Yerbas Buenas', province: 'Linares' },
  // Cauquenes
  { code: 'cauquenes', name: 'Cauquenes', province: 'Cauquenes' },
  { code: 'chanco', name: 'Chanco', province: 'Cauquenes' },
  { code: 'pelluhue', name: 'Pelluhue', province: 'Cauquenes' },
];
