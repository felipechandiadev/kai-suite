import type { SideBarMenuItem } from '@/shared/components/TopBar/SideBar';

/** Showcase UI (oculto temporalmente en sidebar; restaurar entradas según necesidad). */
export const uiComponentItems: SideBarMenuItem[] = [
  { id: 'ui-color-scheme', label: 'Esquema de colores', url: '/design-system/foundations/colors' },
  { id: 'ui-alert', label: 'Alert', url: '/design-system/components/alert' },
  { id: 'ui-autocomplete', label: 'Autocomplete', url: '/design-system/components/autocomplete' },
  { id: 'ui-badge', label: 'Badge', url: '/design-system/components/badge' },
  { id: 'ui-button', label: 'Button', url: '/design-system/components/button' },
  { id: 'ui-calendar', label: 'Calendar', url: '/design-system/components/calendar' },
  { id: 'ui-cards', label: 'Cards', url: '/design-system/components/cards' },
  { id: 'ui-datagrid', label: 'DataGrid', url: '/design-system/components/datagrid' },
  { id: 'ui-dialog', label: 'Dialog', url: '/design-system/components/dialog' },
  { id: 'ui-dot-progress', label: 'Dot progress', url: '/design-system/components/dot-progress' },
  { id: 'ui-icon-button', label: 'Icon Button', url: '/design-system/components/icon-button' },
  {
    id: 'ui-basic-page-layout',
    label: 'Basic page layout',
    url: '/design-system/components/basic-page-layout',
  },
  {
    id: 'ui-collection-page-layout',
    label: 'Collection page layout',
    url: '/design-system/components/collection-page-layout',
  },
  {
    id: 'ui-tab-page-layout',
    label: 'Tab page layout',
    url: '/design-system/components/tab-page-layout',
  },
  { id: 'ui-number-stepper', label: 'Number stepper', url: '/design-system/components/number-stepper' },
  { id: 'ui-stepper', label: 'Stepper', url: '/design-system/components/stepper' },
  { id: 'ui-multimedia', label: 'Multimedia', url: '/design-system/components/multimedia' },
  { id: 'ui-range-slider', label: 'Range slider', url: '/design-system/components/range-slider' },
  { id: 'ui-select', label: 'Select', url: '/design-system/components/select' },
  { id: 'ui-switch', label: 'Switch', url: '/design-system/components/switch' },
  { id: 'ui-tabs', label: 'Tabs', url: '/design-system/components/tabs' },
  { id: 'ui-textfield', label: 'TextField', url: '/design-system/components/textfield' },
];

/**
 * Menú principal ERP + showcase de UI. Origen único para el SideBar.
 */
export const mainMenuItems: SideBarMenuItem[] = [
  { id: 'nav-dashboard', label: 'Panel', url: '/dashboard' },
  { id: 'nav-signals', label: 'Señales', url: '/senales' },
  {
    id: 'nav-sales',
    label: 'Ventas',
    children: [
      { id: 'sales-transactions', label: 'Transacciones', url: '/sales/transactions/sales' },
      { id: 'sales-reports', label: 'Reportes', url: '/sales/reports' },
      { id: 'sales-promotions', label: 'Promociones', url: '/sales/promotions' },
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
      { id: 'purchasing-reports', label: 'Reportes', url: '/purchasing/reports' },
      // { id: 'purchasing-flow', label: 'Flujo del proceso', url: '/purchasing/flow' },
    ],
  },
  {
    id: 'nav-inventory',
    label: 'Inventario y Catálogo',
    children: [
      { id: 'inventory-catalog', label: 'Catálogo', url: '/catalog' },
      { id: 'inventory-stock', label: 'Existencias (Stock)', url: '/inventory/stock' },
      { id: 'inventory-reports', label: 'Reportes', url: '/inventory/reports' },
      { id: 'inventory-units', label: 'Unidades de medida', url: '/inventory/units' },
      { id: 'inventory-storages', label: 'Almacenes', url: '/inventory/storages' },
    ],
  },
  {
    id: 'nav-treasury',
    label: 'Tesorería',
    children: [
      {
        id: 'treasury-operating-expenses',
        label: 'Gastos de operación',
        url: '/treasury/operating-expenses',
      },
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
    id: 'nav-hcm',
    label: 'Capital humano',
    children: [
      { id: 'hcm-employees', label: 'Empleados', url: '/hcm/employees' },
      { id: 'hcm-work-schedules', label: 'Jornadas', url: '/hcm/work-schedules' },
      { id: 'hcm-remunerations', label: 'Remuneraciones', url: '/hcm/remunerations' },
      { id: 'hcm-settings', label: 'Configuración', url: '/hcm/settings' },
    ],
  },
  {
    id: 'nav-production',
    label: 'Producción',
    children: [
      {
        id: 'production-orders',
        label: 'Órdenes de producción',
        url: '/production/orders',
      },
      {
        id: 'production-manufacturing',
        label: 'Manufactura',
        url: '/production/manufacturing',
      },
      {
        id: 'production-elaboration',
        label: 'Elaboración',
        url: '/production/elaboration',
      },
      {
        id: 'production-units',
        label: 'Unidades de producción',
        url: '/production/units',
      },
    ],
  },
  {
    id: 'nav-reparto',
    label: 'Delivery',
    requiresLocalDeliveryEnabled: true,
    children: [
      {
        id: 'reparto-repartos',
        label: 'Repartos',
        url: '/reparto/repartos',
        requiresLocalDeliveryEnabled: true,
      },
      {
        id: 'reparto-calendario',
        label: 'Calendario',
        url: '/reparto/calendario',
        requiresLocalDeliveryEnabled: true,
      },
      {
        id: 'reparto-zonas',
        label: 'Zonas',
        url: '/reparto/zonas',
        requiresLocalDeliveryEnabled: true,
      },
      {
        id: 'reparto-cobertura',
        label: 'Cobertura',
        url: '/reparto/cobertura',
        requiresLocalDeliveryEnabled: true,
      },
      {
        id: 'reparto-configuracion',
        label: 'Configuración',
        url: '/reparto/configuracion',
        requiresLocalDeliveryEnabled: true,
      },
    ],
  },
  {
    id: 'nav-kaifood',
    label: 'KaiFood',
    requiresKaiFoodEnabled: true,
    children: [
      { id: 'kaifood-rooms', label: 'Salones', url: '/kaifood/rooms' },
      {
        id: 'kaifood-config',
        label: 'Configuración',
        url: '/kaifood/configuracion',
      },
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
        id: 'eshop-pedidos',
        label: 'Pedidos web',
        url: '/e-shop/fulfillment',
        requiresEShopEnabled: true,
      },
      {
        id: 'eshop-metodos',
        label: 'Métodos de entrega',
        url: '/e-shop/fulfillment/metodos',
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
    id: 'nav-jewelry',
    label: 'Joyería',
    requiresJewelryEnabled: true,
    children: [
      {
        id: 'jewelry-scale',
        label: 'Balanza',
        url: '/settings/scale',
        requiresJewelryEnabled: true,
      },
      {
        id: 'jewelry-metal-prices',
        label: 'Precios de los metales',
        url: '/settings/metal-prices',
        requiresJewelryEnabled: true,
      },
    ],
  },
  {
    id: 'nav-sii-admin',
    label: 'SII',
    url: '/sii',
    requiresRole: 'ADMIN',
  },
  {
    id: 'nav-sii-super',
    label: 'SII',
    url: '/sii',
    requiresRole: 'SUPER_ADMIN',
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
        requiresMultiCompanyEnabled: true,
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
      { id: 'settings-about', label: 'Acerca de', url: '/settings/about' },
      // { id: 'settings-parameters', label: 'Parámetros del sistema', url: '/settings/parameters' },
    ],
  },
  // { id: 'nav-ui', label: 'UI Components', children: uiComponentItems },
  { id: 'nav-design-system', label: 'Design System', url: '/design-system' },
];
