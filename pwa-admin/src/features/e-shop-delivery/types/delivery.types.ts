export type DeliveryCommuneRow = {
  id: string;
  code: string;
  name: string;
  province: string;
  regionCode: string;
  isEnabled: boolean;
};

export type MauleCommuneGeoJsonProperties = {
  cod_comuna: number;
  codregion: number;
  Comuna: string;
  Provincia: string;
  Region: string;
};

export type MauleCommunesFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: MauleCommuneGeoJsonProperties;
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }>;
};

export type DeliveryZoneRow = {
  id: string;
  name: string;
  shippingFee: number;
  isActive: boolean;
  sortOrder: number;
  communeCode: string | null;
  geometry: { type: 'Polygon'; coordinates: number[][][] } | null;
};

export type DeliverySettingsRow = {
  companyId: string;
  depotLat: number | null;
  depotLng: number | null;
  depotAddress: string | null;
  regionCode: string;
  localDeliveryEnabled: boolean;
  osrmUrl: string | null;
};

export type DeliveryOccurrenceRow = {
  id: string;
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders: number | null;
  driverUserId: string | null;
  isCancelled: boolean;
  routeStatus: string;
};

export type DeliveryOrderRow = {
  id: string;
  transactionId: string;
  deliveryStatus: string;
  commune: string | null;
  addressLine1: string | null;
  customerName: string | null;
  shippingFee: number;
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};
