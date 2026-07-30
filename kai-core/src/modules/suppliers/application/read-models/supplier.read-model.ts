/**
 * Supplier Read Model - Optimized for Query Performance
 *
 * This read model provides a denormalized view of supplier data
 * optimized for common query patterns, reducing N+1 queries and joins.
 *
 * Business Context:
 * - Supplier search and filtering
 * - Supplier details with person information
 * - Supplier transaction summaries
 * - Supplier product catalog
 */

export interface SupplierReadModel {
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

  // Supplier-specific data
  taxId?: string;
  website?: string;
  contactPerson?: string;
  paymentTerms: 'CASH' | 'NET_15' | 'NET_30' | 'NET_60' | 'NET_90';
  isActive: boolean;
  notes?: string;

  // Computed fields for performance
  fullName?: string; // Computed from firstName + lastName or businessName
  displayName: string; // Name to show in UI (fullName or businessName)

  // Transaction summary (denormalized)
  totalPurchases: number;
  totalPayments: number;
  lastPurchaseDate?: Date;
  lastPaymentDate?: Date;
  outstandingBalance: number;

  // Product catalog summary
  totalProducts: number;
  activeProducts: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supplier Search Filters - Optimized for Common Query Patterns
 */
export interface SupplierSearchFilters {
  // Basic filters
  isActive?: boolean;
  personType?: 'NATURAL' | 'LEGAL';
  documentType?: string;
  documentNumber?: string;

  // Text search
  searchText?: string; // Searches in names, document, email, contact person

  // Payment terms
  paymentTerms?: string;

  // Balance filters
  hasOutstandingBalance?: boolean;
  minOutstandingBalance?: number;
  maxOutstandingBalance?: number;

  // Date filters
  createdFrom?: Date;
  createdTo?: Date;
  lastPurchaseFrom?: Date;
  lastPurchaseTo?: Date;

  // Sorting
  sortBy?:
    | 'createdAt'
    | 'displayName'
    | 'documentNumber'
    | 'outstandingBalance'
    | 'lastPurchaseDate'
    | 'totalProducts';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Supplier List Item - Minimal data for list views
 */
export interface SupplierListItem {
  id: string;
  displayName: string;
  documentNumber: string;
  outstandingBalance: number;
  isActive: boolean;
  lastPurchaseDate?: Date;
  totalProducts: number;
}

/**
 * Supplier Detail View - Full data for detail pages
 */
export interface SupplierDetailView extends SupplierReadModel {
  // Additional computed fields
  daysSinceLastPurchase?: number;
  daysSinceLastPayment?: number;

  // Related data summaries
  pendingPaymentsCount: number;
  pendingReceptionsCount: number;
  activeProductsCount: number;
}
