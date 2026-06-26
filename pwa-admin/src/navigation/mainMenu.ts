import type { SideBarMenuItem } from '@/shared/components/TopBar/SideBar';

/** Showcase UI (oculto temporalmente en sidebar; restaurar entradas según necesidad). */
export const uiComponentItems: SideBarMenuItem[] = [
  { id: 'ui-alert', label: 'Alert', url: '/ui-components/alert' },
  { id: 'ui-autocomplete', label: 'Autocomplete', url: '/ui-components/autocomplete' },
  { id: 'ui-badge', label: 'Badge', url: '/ui-components/badge' },
  { id: 'ui-button', label: 'Button', url: '/ui-components/button' },
  { id: 'ui-cards', label: 'Cards', url: '/ui-components/cards' },
  { id: 'ui-datagrid', label: 'DataGrid', url: '/ui-components/datagrid' },
  { id: 'ui-dialog', label: 'Dialog', url: '/ui-components/dialog' },
  { id: 'ui-dot-progress', label: 'Dot progress', url: '/ui-components/dot-progress' },
  { id: 'ui-icon-button', label: 'Icon Button', url: '/ui-components/icon-button' },
  {
    id: 'ui-basic-page-layout',
    label: 'Basic page layout',
    url: '/ui-components/basic-page-layout',
  },
  {
    id: 'ui-collection-page-layout',
    label: 'Collection page layout',
    url: '/ui-components/collection-page-layout',
  },
  {
    id: 'ui-tab-page-layout',
    label: 'Tab page layout',
    url: '/ui-components/tab-page-layout',
  },
  { id: 'ui-number-stepper', label: 'Number stepper', url: '/ui-components/number-stepper' },
  { id: 'ui-stepper', label: 'Stepper', url: '/ui-components/stepper' },
  { id: 'ui-multimedia', label: 'Multimedia', url: '/ui-components/multimedia' },
  { id: 'ui-range-slider', label: 'Range slider', url: '/ui-components/range-slider' },
  { id: 'ui-select', label: 'Select', url: '/ui-components/select' },
  { id: 'ui-switch', label: 'Switch', url: '/ui-components/switch' },
  { id: 'ui-tabs', label: 'Tabs', url: '/ui-components/tabs' },
  { id: 'ui-textfield', label: 'TextField', url: '/ui-components/textfield' },
];

/**
 * Menú principal ERP + showcase de UI. Origen único para el SideBar.
 */
export const mainMenuItems: SideBarMenuItem[] = [
  { id: 'nav-dashboard', label: 'Panel', url: '/dashboard' },
  {
    id: 'nav-sales',
    label: 'Ventas',
    children: [
      { id: 'sales-transactions', label: 'Transacciones', url: '/sales/transactions/sales' },
      // { id: 'sales-promotions', label: 'Promociones', url: '/sales/promotions' },
      { id: 'sales-customers', label: 'Clientes', url: '/sales/customers' },
      { id: 'sales-pos', label: 'Puntos de venta', url: '/sales/points-of-sale' },
      { id: 'sales-cash-sessions', label: 'Sesiones de caja', url: '/sales/cash-sessions' },
      { id: 'sales-price-lists', label: 'Listas de precios', url: '/sales/price-lists' },
    ],
  },
  {
    id: 'nav-purchasing',
    label: 'Compras',
    children: [
      {
        id: 'purchasing-transactions',
        label: 'Transacciones',
        url: '/purchasing/transactions/receptions',
      },
      { id: 'purchasing-suppliers', label: 'Proveedores', url: '/purchasing/suppliers' },
      { id: 'purchasing-dte', label: "DTE's proveedor", url: '/purchasing/dte' },
      // { id: 'purchasing-flow', label: 'Flujo del proceso', url: '/purchasing/flow' },
    ],
  },
  {
    id: 'nav-inventory',
    label: 'Inventario y Catálogo',
    children: [
      { id: 'inventory-catalog', label: 'Catálogo', url: '/catalog' },
      { id: 'inventory-stock', label: 'Existencias (Stock)', url: '/inventory/stock' },
      { id: 'inventory-units', label: 'Unidades de medida', url: '/inventory/units' },
      { id: 'inventory-storages', label: 'Almacenes', url: '/inventory/storages' },
    ],
  },
  {
    id: 'nav-treasury',
    label: 'Tesorería',
    children: [
      { id: 'treasury-expenses', label: 'Gastos operativos', url: '/treasury/expenses' },
      { id: 'treasury-expense-categories', label: 'Categorías de gasto', url: '/treasury/expense-categories' },
      { id: 'treasury-accounts', label: 'Cuentas bancarias y cajas', url: '/treasury/accounts' },
      {
        id: 'treasury-checks',
        label: 'Cheques',
        url: '/treasury/checks',
        requiresChecksEnabled: true,
      },
      // { id: 'treasury-reconciliations', label: 'Conciliaciones', url: '/treasury/reconciliations' },
      // { id: 'treasury-cash-flow', label: 'Flujo de caja (Cash flow)', url: '/treasury/cash-flow' },
    ],
  },
  {
    id: 'nav-accounting',
    label: 'Contabilidad',
    children: [
      // { id: 'acc-coa', label: 'Plan de cuentas', url: '/accounting/chart-of-accounts' },
      // { id: 'acc-rules', label: 'Reglas contables', url: '/accounting/rules' },
      // { id: 'acc-automation', label: 'Automatizaciones', url: '/accounting/automation' },
      // { id: 'acc-flows', label: 'Flujos', url: '/accounting/flows/sales' },
      // { id: 'acc-transaction-types', label: 'Transacciones soportadas', url: '/accounting/transactions' },
      { id: 'acc-ar', label: 'Cuentas por cobrar', url: '/accounting/accounts-receivable' },
      { id: 'acc-ap', label: 'Cuentas por pagar', url: '/accounting/accounts-payable' },
      // { id: 'acc-ledgers', label: 'Libros contables', url: '/accounting/ledgers' },
      // { id: 'acc-journal-entries', label: 'Asientos manuales', url: '/accounting/journal-entries' },
      { id: 'acc-taxes', label: 'Impuestos', url: '/accounting/taxes' },
      // { id: 'acc-reports', label: 'Estados financieros', url: '/accounting/reports' },
    ],
  },
  {
    id: 'nav-hr',
    label: 'RRHH',
    children: [
      { id: 'hr-employees', label: 'Empleados', url: '/hr/employees' },
      { id: 'hr-remunerations', label: 'Remuneraciones', url: '/hr/remunerations' },
      // { id: 'hr-org-units', label: 'Unidades organizativas', url: '/hr/organizational-units' },
    ],
  },
  {
    id: 'nav-eshop',
    label: 'eShop',
    requiresEShopEnabled: true,
    children: [
      {
        id: 'eshop-appearance',
        label: 'Apariencia',
        url: '/e-shop/appearance',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-topbar',
        label: 'Topbar',
        url: '/e-shop/topbar',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-footer',
        label: 'Footer',
        url: '/e-shop/footer',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-hero',
        label: 'Hero / Slider',
        url: '/e-shop/hero-slides',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-testimonials',
        label: 'Testimonios',
        url: '/e-shop/testimonials',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-featured',
        label: 'Productos destacados',
        url: '/e-shop/featured',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-shipping',
        label: 'Encargos y envíos',
        url: '/e-shop/fulfillment',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-integrations',
        label: 'Integraciones',
        url: '/e-shop/integrations',
        requiresEShopEnabled: true,
      },
    ],
  },
  {
    id: 'nav-settings',
    label: 'Configuración',
    children: [
      {
        id: 'settings-companies',
        label: 'Empresas',
        url: '/settings/companies',
        requiresRole: 'SUPER_ADMIN',
        /** Empresas se provisionan por seed; no listar en sidebar. */
        hidden: true,
      },
      {
        id: 'settings-company-super',
        label: 'Empresa actual',
        url: '/settings/company',
        requiresRole: 'SUPER_ADMIN',
      },
      {
        id: 'settings-company-admin',
        label: 'Empresa',
        url: '/settings/company',
        requiresRole: 'ADMIN',
      },
      {
        id: 'settings-company-operator',
        label: 'Empresa',
        url: '/settings/company',
        requiresRole: 'OPERATOR',
      },
      { id: 'settings-branches', label: 'Sucursales', url: '/settings/branches' },
      { id: 'settings-users', label: 'Usuarios', url: '/settings/users' },
      { id: 'settings-local-printing', label: 'Impresión local', url: '/settings/local-printing' },
      { id: 'settings-integrations', label: 'Integraciones', url: '/settings/integrations' },
      { id: 'settings-scale', label: 'Balanza', url: '/settings/scale' },
      { id: 'settings-metal-prices', label: 'Precios de metales', url: '/settings/metal-prices' },
      // { id: 'settings-parameters', label: 'Parámetros del sistema', url: '/settings/parameters' },
    ],
  },
  // { id: 'nav-ui', label: 'UI Components', children: uiComponentItems },
];
