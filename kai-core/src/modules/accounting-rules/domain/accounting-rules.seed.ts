/**
 * SEED DE REGLAS CONTABLES INICIALES
 *
 * Este archivo contiene un array de objetos que representan las reglas
 * contables que DEBEN ser registradas en la BD antes de que el motor
 * de asientos pueda funcionar.
 *
 * Cada regla define qué cuentas se debitan y acreditan para cada tipo
 * de transacción.
 *
 * TODO: Estas reglas deben ser insertadas en la BD por un script de migración
 * o durante el seed inicial de la aplicación.
 */

export const ACCOUNTING_RULES_SEED = [
  // ============================================
  // A. TESORERIA Y CAPITAL (Banking)
  // ============================================

  {
    name: 'Capital Contribution - Cash',
    companyId: 'PLACEHOLDER_COMPANY_ID', // Reemplazar por companyId real
    appliesTo: 'TRANSACTION',
    transactionType: 'PAYMENT_IN',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: 'CASH', // Solo capturan efectivo
    debitAccountCode: '1.1.01', // Caja
    creditAccountCode: '3.1.01', // Capital social
    priority: 10,
    isActive: true,
    metadata: {
      description: 'Aporte de capital en efectivo',
      condition: 'metadata.capitalContribution === true',
    },
  },

  {
    name: 'Bank Withdrawal to Shareholder',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'BANK_WITHDRAWAL_TO_SHAREHOLDER',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '3.1.01', // Capital social (reduce)
    creditAccountCode: '1.1.02', // Banco
    priority: 10,
    isActive: true,
    metadata: {
      description: 'Egreso bancario a socio (retiro de aportes)',
      condition: 'metadata.bankWithdrawalToShareholder === true',
    },
  },

  {
    name: 'Bank to Cash Transfer',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'BANK_TO_CASH_TRANSFER',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: 'TRANSFER',
    debitAccountCode: '1.1.01', // Caja
    creditAccountCode: '1.1.02', // Banco
    priority: 10,
    isActive: true,
    metadata: {
      description: 'Transferencia de banco a caja',
      condition: 'metadata.bankToCashTransfer === true',
    },
  },

  {
    name: 'Cash to Bank Deposit',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_DEPOSIT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.02', // Banco
    creditAccountCode: '1.1.01', // Caja
    priority: 10,
    isActive: true,
    metadata: {
      description: 'Depósito de efectivo en banco',
      condition: 'metadata.cashDeposit === true',
    },
  },

  // ============================================
  // B. VENTAS Y COBRANZAS (Sales)
  // ============================================

  {
    name: 'Sale at Cash',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: 'CASH',
    debitAccountCode: '1.1.01', // Caja
    creditAccountCode: '4.1.01', // Ingresos operacionales
    priority: 20,
    isActive: true,
    metadata: {
      description: 'Venta al contado - ingreso',
      scope: 'TRANSACTION_LINE',
    },
  },

  {
    name: 'Sale on Credit',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: 'CREDIT',
    debitAccountCode: '1.1.03', // Clientes por cobrar
    creditAccountCode: '4.1.01', // Ingresos operacionales
    priority: 20,
    isActive: true,
    metadata: {
      description: 'Venta a crédito - deuda de cliente',
    },
  },

  {
    name: 'Sale by Bank Transfer',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: 'TRANSFER',
    debitAccountCode: '1.1.02', // Banco
    creditAccountCode: '4.1.01', // Ingresos operacionales
    priority: 20,
    isActive: true,
    metadata: {
      description: 'Venta por transferencia bancaria',
    },
  },

  {
    name: 'IVA on Sales Transactions',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE',
    expenseCategoryId: null,
    taxId: 'PLACEHOLDER_IVA_TAX_ID', // ID del IVA 19%
    paymentMethod: null,
    debitAccountCode: '2.2.01', // IVA por pagar (pasivo)
    creditAccountCode: '4.1.01', // Ingresos (reduce neto)
    priority: 21,
    isActive: true,
    metadata: {
      description: 'Obligación de IVA en venta',
      applyToLineWhere: 'taxId exists',
    },
  },

  {
    name: 'Payment In (Collection)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'PAYMENT_IN',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.02', // Banco / Caja (dependiendo de paymentMethod)
    creditAccountCode: '1.1.03', // Clientes por cobrar
    priority: 30,
    isActive: true,
    metadata: {
      description: 'Cobro a cliente',
      NOTE: 'El DEBE será 1.1.01 (Caja) o 1.1.02 (Banco) según paymentMethod',
    },
  },

  // ============================================
  // C. COMPRAS Y PAGOS (Purchasing)
  // ============================================

  {
    name: 'Purchase of Inventory',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'PURCHASE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.2.01', // Inventario
    creditAccountCode: '2.1.01', // Proveedores por pagar
    priority: 40,
    isActive: true,
    metadata: {
      description: 'Compra de inventario - activo',
    },
  },

  {
    name: 'Purchase of Expense/Service',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'PURCHASE',
    expenseCategoryId: 'ANY', // Aplica si expenseCategoryId está presente
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '5.3.01', // Gastos operacionales
    creditAccountCode: '2.1.01', // Proveedores por pagar
    priority: 41,
    isActive: true,
    metadata: {
      description: 'Compra de gasto/servicio - gasto directo',
    },
  },

  {
    name: 'IVA Deductible on Purchases',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'PURCHASE',
    expenseCategoryId: null,
    taxId: 'PLACEHOLDER_IVA_TAX_ID',
    paymentMethod: null,
    debitAccountCode: '1.2.04', // IVA pagado (activo/crédito fiscal)
    creditAccountCode: '2.1.01', // Proveedores por pagar
    priority: 42,
    isActive: true,
    metadata: {
      description: 'IVA deducible en compras',
    },
  },

  {
    name: 'Supplier payment (accounts payable)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'SUPPLIER_PAYMENT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '2.1.01', // Proveedores por pagar
    creditAccountCode: '1.1.02', // Banco / Caja
    priority: 50,
    isActive: true,
    metadata: {
      description: 'Pago a proveedor',
      NOTE: 'El HABER será 1.1.01 (Caja) o 1.1.02 (Banco) según paymentMethod',
    },
  },

  {
    name: 'Payroll payment (remuneraciones por pagar)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'PAYROLL_PAYMENT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '2.2.01', // Remuneraciones por pagar
    creditAccountCode: '1.1.02', // Banco / Caja
    priority: 50,
    isActive: true,
    metadata: {
      description: 'Pago de remuneraciones',
      NOTE: 'El HABER será 1.1.01 (Caja) o 1.1.02 (Banco) según paymentMethod',
    },
  },

  // ============================================
  // D. OPERACIONES Y GASTOS (Operations)
  // ============================================

  {
    name: 'Operating Expense - Accounts Payable',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'OPERATING_EXPENSE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '5.3.01', // Gastos operacionales
    creditAccountCode: '2.1.01', // Cuentas por pagar a proveedores
    priority: 60,
    isActive: true,
    metadata: {
      description: 'Gasto operativo - genera cuenta por pagar',
    },
  },

  {
    name: 'Payroll Accrual',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'PAYROLL',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '5.4.01', // Gasto de nómina
    creditAccountCode: '2.2.04', // Salarios por pagar
    priority: 61,
    isActive: true,
    metadata: {
      description: 'Devengo de nómina (no pagada aún)',
    },
  },

  // ============================================
  // E. INVENTARIO Y ALMACENES (Inventory)
  // ============================================

  {
    name: 'Inventory Transfer (Out)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'TRANSFER_OUT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.2.01', // Inventario bodega destino
    creditAccountCode: '1.2.01', // Inventario bodega origen
    priority: 70,
    isActive: true,
    metadata: {
      description: 'Transferencia interna de inventario',
    },
  },

  {
    name: 'Inventory Adjustment (Positive)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'ADJUSTMENT_IN',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.2.01', // Inventario
    creditAccountCode: '4.2.01', // Recuperos de mermas
    priority: 71,
    isActive: true,
    metadata: {
      description: 'Ajuste positivo de inventario (devoluciones, recuperos)',
    },
  },

  {
    name: 'Inventory Adjustment (Negative)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'ADJUSTMENT_OUT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '5.2.01', // Pérdidas y mermas
    creditAccountCode: '1.2.01', // Inventario
    priority: 72,
    isActive: true,
    metadata: {
      description: 'Ajuste negativo de inventario (mermas, robos)',
    },
  },

  // ============================================
  // F. CAJA Y SESIONES (Cash Sessions)
  // ============================================

  {
    name: 'Cash Session Opening',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_OPENING',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.01', // Caja (sesión creada)
    creditAccountCode: '1.1.01', // Caja general (fondo extraído)
    priority: 80,
    isActive: true,
    metadata: {
      description: 'Apertura de sesión de caja',
      NOTE: 'Traslada fondo de caja general a sesión temporal',
    },
  },

  {
    name: 'Cash Session Deposit',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_DEPOSIT',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.01', // Caja (sesión reforzada)
    creditAccountCode: '1.1.01', // Caja general
    priority: 81,
    isActive: true,
    metadata: {
      description: 'Depósito manual de efectivo en sesión de caja',
    },
  },

  {
    name: 'Cash Session Withdrawal',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_WITHDRAWAL',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.01', // Caja general
    creditAccountCode: '1.1.01', // Caja (sesión)
    priority: 82,
    isActive: true,
    metadata: {
      description: 'Retiro manual de efectivo desde sesión de caja',
    },
  },

  {
    name: 'Cash Session Closing - Exact',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_CLOSING',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.01', // Caja general
    creditAccountCode: '1.1.01', // Caja (sesión cierre)
    priority: 83,
    isActive: true,
    metadata: {
      description: 'Cierre de sesión sin diferencia',
      condition: 'difference === 0',
    },
  },

  {
    name: 'Cash Session Closing - Surplus',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_CLOSING',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '1.1.01', // Caja general
    creditAccountCode: '2.2.03', // Sobrantes (ingresos)
    priority: 83,
    isActive: true,
    metadata: {
      description: 'Cierre de sesión con sobrante (ganancia no explicada)',
      condition: 'difference > 0',
    },
  },

  {
    name: 'Cash Session Closing - Shortage',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CASH_SESSION_CLOSING',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '5.2.02', // Faltante de caja
    creditAccountCode: '1.1.01', // Caja general
    priority: 83,
    isActive: true,
    metadata: {
      description: 'Cierre de sesión con faltante (pérdida no explicada)',
      condition: 'difference < 0',
    },
  },

  // ============================================
  // G. DEVOLUCIONES (Returns)
  // ============================================

  {
    name: 'Sales Return - Reversal',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE_RETURN',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '4.1.02', // Devoluciones y descuentos
    creditAccountCode: '4.1.01', // Ingresos (reverso)
    priority: 90,
    isActive: true,
    metadata: {
      description: 'Devolución de venta - reverso de ingreso',
    },
  },

  {
    name: 'IVA Reversal on Sales Return',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SALE_RETURN',
    expenseCategoryId: null,
    taxId: 'PLACEHOLDER_IVA_TAX_ID',
    paymentMethod: null,
    debitAccountCode: '4.1.02', // Devoluciones
    creditAccountCode: '2.2.01', // IVA por pagar (reverso)
    priority: 91,
    isActive: true,
    metadata: {
      description: 'Reverso de IVA en devolución',
    },
  },

  {
    name: 'Purchase Return - Reversal',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'PURCHASE_RETURN',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '2.1.01', // Proveedores por pagar (reverso)
    creditAccountCode: '1.2.01', // Inventario (reverso)
    priority: 92,
    isActive: true,
    metadata: {
      description: 'Devolución de compra',
    },
  },

  {
    name: 'IVA Reversal on Purchase Return',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'PURCHASE_RETURN',
    expenseCategoryId: null,
    taxId: 'PLACEHOLDER_IVA_TAX_ID',
    paymentMethod: null,
    debitAccountCode: '2.1.01', // Proveedores (reverso)
    creditAccountCode: '1.2.04', // IVA pagado (reverso)
    priority: 93,
    isActive: true,
    metadata: {
      description: 'Reverso de IVA deducible en devolución',
    },
  },

  /**
   * Nota de crédito proveedor: reduce CxP (2.1.01) sin repetir salida de inventario
   * (el stock ya salió con PURCHASE_RETURN). Contra ingreso / descuento sobre compras (4.1.02).
   * Activar en BD por compañía según política contable.
   */
  {
    name: 'Supplier Credit Note - reduce AP',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'SUPPLIER_CREDIT_NOTE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '2.1.01',
    creditAccountCode: '4.1.02',
    priority: 94,
    isActive: true,
    metadata: {
      description: 'NC proveedor: baja pasivo proveedores vs devoluciones/descuentos',
    },
  },

  {
    name: 'IVA on Supplier Credit Note (line)',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION_LINE',
    transactionType: 'SUPPLIER_CREDIT_NOTE',
    expenseCategoryId: null,
    taxId: 'PLACEHOLDER_IVA_TAX_ID',
    paymentMethod: null,
    debitAccountCode: '2.1.01',
    creditAccountCode: '1.2.04',
    priority: 95,
    isActive: true,
    metadata: {
      description: 'Ajuste IVA deducible en nota de crédito proveedor',
    },
  },

  /**
   * Nota de crédito cliente: reduce CxC (1.1.02) sin repetir inventario
   * (el stock ya entró con SALE_RETURN). Contra devoluciones/descuentos (4.1.02).
   */
  {
    name: 'Customer Credit Note - reduce AR',
    companyId: 'PLACEHOLDER_COMPANY_ID',
    appliesTo: 'TRANSACTION',
    transactionType: 'CUSTOMER_CREDIT_NOTE',
    expenseCategoryId: null,
    taxId: null,
    paymentMethod: null,
    debitAccountCode: '4.1.02',
    creditAccountCode: '1.1.02',
    priority: 96,
    isActive: true,
    metadata: {
      description: 'NC cliente: devoluciones vs cuentas por cobrar',
    },
  },
];

/**
 * INSTRUCCIONES DE USO:
 *
 * 1. Obtén los IDs reales de tu compañía, cuentas e impuestos:
 *    - companyId: Desde la tabla companies
 *    - debitAccountCode / creditAccountCode: Desde accounting_accounts donde código = '1.1.01', etc.
 *    - taxId para IVA: Desde taxes donde percentage = 19 y country = 'CL'
 *
 * 2. Reemplaza los PLACEHOLDER_* con los IDs reales
 *
 * 3. Ejecuta un script que haga INSERT en accounting_rules con estos datos:
 *    INSERT INTO accounting_rules (...) VALUES (...)
 *
 * 4. Verifica que las reglas están en la BD:
 *    SELECT * FROM accounting_rules WHERE companyId = 'xxx' ORDER BY priority, transactionType;
 *
 * 5. Ahora el motor de asientos puede comenzar a generar asientos automáticamente.
 */
