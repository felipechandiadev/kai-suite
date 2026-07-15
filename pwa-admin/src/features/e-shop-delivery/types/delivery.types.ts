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

export type DeliveryOccurrenceKind = "LOCAL_DELIVERY" | "PICKUP";

export type DeliveryOccurrenceZoneRef = {
  id: string;
  name: string;
};

export type DeliveryOccurrenceRow = {
  id: string;
  name: string;
  kind: DeliveryOccurrenceKind;
  occurrenceDate: string;
  departureTime: string;
  endTime: string | null;
  orderCutoffTime: string;
  maxOrders: number | null;
  driverUserId: string | null;
  isCancelled: boolean;
  routeStatus: string;
  zoneIds: string[];
  zones: DeliveryOccurrenceZoneRef[];
  orderCount: number;
  availableSlots: number | null;
  canEdit: boolean;
  canCancel: boolean;
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

export type DeliveryDriverRow = {
  id: string;
  login: string;
  displayName: string;
  email: string | null;
};

export type DeliveryOperationsStatus =
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_DISPATCH"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "ISSUE";

export type DeliveryOperationsOrderLine = {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPicked: boolean;
};

export type DeliveryOperationsOrder = {
  id: string;
  transactionId: string;
  orderNumber: string;
  deliveryStatus: string;
  customerLabel: string;
  customerPhone: string | null;
  addressShort: string;
  commune: string | null;
  shippingFee: number;
  itemsSummary: string;
  lineCount: number;
  pickedCount: number;
  lines: DeliveryOperationsOrderLine[];
  allowedNextStatuses: string[];
  createdAt: string;
};

export type DeliveryOperationsOccurrence = {
  id: string;
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders: number | null;
  driverUserId: string | null;
  driverLabel: string | null;
  isCancelled: boolean;
  routeStatus: string;
  zones: DeliveryOccurrenceZoneRef[];
  orderCounts: Partial<Record<string, number>>;
  totalDistanceM: number | null;
  totalDurationS: number | null;
  stopCount: number;
  routeOptimizedAt: string | null;
  routeStartedAt: string | null;
  routeCompletedAt: string | null;
};

export type DeliveryOperationsBoard = {
  date: string;
  occurrence: DeliveryOperationsOccurrence | null;
  ordersByStatus: Partial<Record<string, DeliveryOperationsOrder[]>>;
  totals: Partial<Record<string, number>>;
  submittedCount: number;
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};
