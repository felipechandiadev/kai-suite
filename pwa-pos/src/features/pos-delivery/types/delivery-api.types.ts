export type {
  PosDeliveryConfig,
} from "./pos-delivery.types";

export type DeliveryCoverageResponse = {
  regionName: string;
  localDeliveryEnabled: boolean;
  communes: Array<{ code: string; name: string; province: string }>;
  allCommunes?: Array<{ code: string; name: string; province: string }>;
};

export type DeliveryGeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  commune?: string | null;
  region?: string | null;
};

export type ResolvedDeliveryZone = {
  zoneId: string;
  zoneName: string;
  shippingFee: number;
  communeCode: string | null;
};

export type DeliveryQuoteResult = {
  shippingFee: number;
  freeShippingApplied: boolean;
};

export type DeliveryOccurrenceOption = {
  id: string;
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  availableSlots: number | null;
};
