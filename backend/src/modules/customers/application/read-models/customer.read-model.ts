/**
 * Customer Read Model - Optimized for Query Performance
 *
 * This read model provides a denormalized view of customer data
 * optimized for common query patterns, reducing N+1 queries and joins.
 *
 * Business Context:
 * - Customer search and filtering
 * - Customer details with person information
 * - Customer credit and balance information
 * - Customer transaction summaries
 */

export interface CustomerReadModel {
  // Primary identifiers
  id: string;
  personId: string;

  // Denormalized person data (avoiding joins)
  personType: 'NATURAL' | 'LEGAL';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType: 'OTHER' | 'CUIT' | 'CUIL' | 'PASSPORT' | 'RUT';
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;

  // Customer-specific data
  creditLimit: number;
  currentBalance: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  isActive: boolean;
  notes?: string;

  // Computed fields for performance
  fullName?: string; // Computed from firstName + lastName or businessName
  displayName: string; // Name to show in UI (fullName or businessName)
  availableCredit: number; // Computed: creditLimit - currentBalance

  // Transaction summary (denormalized)
  totalPurchases: number;
  totalPayments: number;
  lastPurchaseDate?: Date;
  lastPaymentDate?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer Search Filters - Optimized for Common Query Patterns
 */
export interface CustomerSearchFilters {
  // Basic filters
  isActive?: boolean;
  personType?: 'NATURAL' | 'LEGAL';
  documentType?: string;
  documentNumber?: string;

  // Text search
  searchText?: string; // Searches in names, document, email

  // Credit filters
  minCreditLimit?: number;
  maxCreditLimit?: number;
  hasAvailableCredit?: boolean;

  // Date filters
  createdFrom?: Date;
  createdTo?: Date;
  lastPurchaseFrom?: Date;
  lastPurchaseTo?: Date;

  // Sorting
  sortBy?:
    | 'createdAt'
    | 'fullName'
    | 'documentNumber'
    | 'creditLimit'
    | 'currentBalance'
    | 'lastPurchaseDate'
    | 'displayName';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Customer List Item - Minimal data for list views
 */
export interface CustomerListItem {
  id: string;
  displayName: string;
  documentNumber: string;
  availableCredit: number;
  isActive: boolean;
  lastPurchaseDate?: Date;
}

/**
 * Customer Detail View - Full data for detail pages
 */
export interface CustomerDetailView extends CustomerReadModel {
  // Additional computed fields
  creditUtilizationPercentage: number; // (currentBalance / creditLimit) * 100
  daysSinceLastPurchase?: number;
  daysSinceLastPayment?: number;

  // Related data summaries
  pendingPaymentsCount: number;
  pendingPurchasesCount: number;
  activeInstallmentsCount: number;
}
