export type DeliveryDispatchStatus =
  | 'planned'
  | 'route_ready'
  | 'out'
  | 'completed'
  | 'cancelled';

export type DeliveryOccurrenceKind = 'LOCAL_DELIVERY' | 'PICKUP';

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

/** Canal de captura del pedido de delivery. */
export type DeliverySourceChannel = 'POS' | 'ESHOP';

export type DeliveryOccurrenceZoneRef = {
  id: string;
  name: string;
};

export type DeliveryOccurrenceAdminRow = {
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
  routeStatus: DeliveryDispatchStatus;
  zoneIds: string[];
  zones: DeliveryOccurrenceZoneRef[];
  orderCount: number;
  availableSlots: number | null;
  canEdit: boolean;
  canCancel: boolean;
};

export type SaveDeliveryOccurrenceInput = {
  name: string;
  kind?: DeliveryOccurrenceKind;
  occurrenceDate: string;
  departureTime: string;
  /** Required when kind is PICKUP. */
  endTime?: string | null;
  orderCutoffTime: string;
  maxOrders?: number | null;
  driverUserId?: string | null;
  zoneIds?: string[];
  isCancelled?: boolean;
};

export type UpdateDeliveryOccurrenceInput = Partial<SaveDeliveryOccurrenceInput>;

export type DeliveryDriverDto = {
  id: string;
  login: string;
  displayName: string;
  email: string | null;
};

export type DeliveryOrderCounts = Partial<Record<DeliveryOrderStatus, number>>;

export type DeliveryOperationsOrderLineDto = {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPicked: boolean;
};

export type DeliveryOperationsOrderDto = {
  id: string;
  transactionId: string;
  orderNumber: string;
  deliveryStatus: DeliveryOrderStatus;
  sourceChannel: DeliverySourceChannel;
  customerLabel: string;
  customerPhone: string | null;
  addressShort: string;
  commune: string | null;
  shippingFee: number;
  itemsSummary: string;
  lineCount: number;
  pickedCount: number;
  lines: DeliveryOperationsOrderLineDto[];
  allowedNextStatuses: DeliveryOrderStatus[];
  createdAt: string;
};

export type DeliveryOperationsBoardOccurrenceDto = {
  id: string;
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders: number | null;
  driverUserId: string | null;
  driverLabel: string | null;
  isCancelled: boolean;
  routeStatus: DeliveryDispatchStatus;
  zones: DeliveryOccurrenceZoneRef[];
  orderCounts: DeliveryOrderCounts;
  totalDistanceM: number | null;
  totalDurationS: number | null;
  stopCount: number;
  routeOptimizedAt: string | null;
  routeStartedAt: string | null;
  routeCompletedAt: string | null;
};

export type DeliveryOperationsTotals = DeliveryOrderCounts;

export type DeliveryOperationsBoardDto = {
  date: string;
  occurrence: DeliveryOperationsBoardOccurrenceDto | null;
  ordersByStatus: Partial<Record<DeliveryOrderStatus, DeliveryOperationsOrderDto[]>>;
  totals: DeliveryOperationsTotals;
  submittedCount: number;
};

export const DELIVERY_OPERATIONS_STAGES: DeliveryOrderStatus[] = [
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'DELIVERED',
  'ISSUE',
];

export const DELIVERY_ORDER_STATUS_TRANSITIONS: Record<
  DeliveryOrderStatus,
  DeliveryOrderStatus[]
> = {
  SUBMITTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DISPATCH', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'ISSUE', 'CANCELLED'],
  DELIVERED: [],
  ISSUE: ['DELIVERED', 'CANCELLED'],
  CANCELLED: [],
};

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
