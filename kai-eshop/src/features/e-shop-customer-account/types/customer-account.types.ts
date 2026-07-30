export type EShopCustomerProfile = {
  customerId: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  documentNumber: string | null;
  documentType: string | null;
  creditLimit: number;
  currentBalance: number;
};

export type EShopCustomerOrderRow = {
  id: string;
  documentNumber: string;
  transactionType: string;
  total: number;
  createdAt: string;
  fulfillmentStatus: string;
  fulfillmentMethodName: string | null;
  isLegacy: boolean;
  backorderReservationStatus?: string | null;
};

export type EShopCustomerOrderDetail = EShopCustomerOrderRow & {
  statusHistory: Array<{ status: string; at: string; note?: string | null }>;
  lines: Array<{
    id: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
  shippingAddress: Record<string, string | null> | null;
};

export type EShopCustomerSummary = {
  profile: EShopCustomerProfile;
  recentOrders: EShopCustomerOrderRow[];
  openBackordersCount: number;
  debtSummary: { pendingCount: number; totalDue: number } | null;
};
