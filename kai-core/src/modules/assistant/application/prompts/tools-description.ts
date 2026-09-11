import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const SALES_REPORT_IDS = [
  'sales-by-period',
  'sales-detail',
  'sales-by-product',
  'customer-returns',
  'customer-purchases',
  'cash-session-close',
  'top-products',
  'sales-by-payment-method',
  'sales-by-pos',
  'credit-notes',
  'promotion-redemptions',
  'quotations-funnel',
  'backorders-status',
  'sales-by-category',
  'sales-period-compare',
  'pos-compare',
] as const;

export const INVENTORY_REPORT_IDS = [
  'stock-valuation',
  'stock-alerts',
  'stock-by-storage',
  'stock-by-category',
  'stock-movement-trend',
  'inventory-transfers',
  'inventory-adjustments',
  'inventory-period-compare',
] as const;

export const PURCHASING_REPORT_IDS = [
  'purchases-by-period',
  'purchase-detail',
  'purchases-by-product',
  'purchases-by-supplier',
  'purchases-by-payment-method',
  'supplier-returns',
  'purchases-period-compare',
] as const;

export const DINING_REPORT_IDS = [
  'dining-salon-summary',
  'dining-by-hour',
  'dining-by-table',
  'dining-period-compare',
] as const;

const reportParams = {
  type: 'object',
  description: 'Parámetros del handler (dateFrom, dateTo, branchId, customerId, etc.)',
  additionalProperties: true,
} as const;

export const SAMI_CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_branches',
      description: 'Lista sucursales activas de la empresa.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_report_catalog',
      description:
        'Lista reportes disponibles (id, título, descripción) por dominio. Usar si el usuario pregunta qué reportes hay.',
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            enum: ['sales', 'inventory', 'purchasing', 'dining', 'hcm'],
            description: 'Opcional. Si se omite, lista todos los dominios permitidos.',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description:
        'Busca clientes activos por nombre (máx. 10). Devuelve customerId y displayName, sin RUT/email/teléfono. Para ranking de quién compra más usá run_semantic_query dimensión customer, no esta tool.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto de búsqueda (nombre). Vacío lista los primeros.' },
          pageSize: { type: 'number', description: '1 a 10, default 10' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_sales_report',
      description:
        'Ejecuta un reporte de ventas existente (SalesReportRunner). dateFrom/dateTo YYYY-MM-DD cuando el reporte lo exige. customer-purchases requiere customerId. cash-session-close acepta cashSessionId. “quién compra más” NO es este reporte: usá run_semantic_query dataset=sales dimensión customer.',
      parameters: {
        type: 'object',
        properties: {
          reportId: { type: 'string', enum: [...SALES_REPORT_IDS] },
          dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
          dateTo: { type: 'string', description: 'YYYY-MM-DD' },
          branchId: { type: 'string' },
          granularity: { type: 'string', enum: ['day', 'week', 'month'] },
          customerId: { type: 'string', description: 'UUID, requerido en customer-purchases' },
          cashSessionId: { type: 'string' },
          compareWith: { type: 'string' },
          limit: { type: 'number' },
          params: reportParams,
        },
        required: ['reportId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_inventory_report',
      description: 'Reportes de inventario (stock, bodegas, movimientos, ajustes).',
      parameters: {
        type: 'object',
        properties: {
          reportId: { type: 'string', enum: [...INVENTORY_REPORT_IDS] },
          branchId: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          params: reportParams,
        },
        required: ['reportId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_purchasing_report',
      description: 'Reportes de compras a proveedores. Periodo dateFrom/dateTo cuando aplique.',
      parameters: {
        type: 'object',
        properties: {
          reportId: { type: 'string', enum: [...PURCHASING_REPORT_IDS] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          params: reportParams,
        },
        required: ['reportId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_dining_report',
      description:
        'Reportes de salón KaiFood (cuentas, mesas, hora). Solo si el deploy es KaiFood.',
      parameters: {
        type: 'object',
        properties: {
          reportId: { type: 'string', enum: [...DINING_REPORT_IDS] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          branchId: { type: 'string' },
          params: reportParams,
        },
        required: ['reportId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_hcm_report',
      description:
        'Reportes de RRHH (solo ADMIN). reportId hours-planned-by-employee. Requiere dateFrom y dateTo.',
      parameters: {
        type: 'object',
        properties: {
          reportId: {
            type: 'string',
            enum: ['hours-planned-by-employee'],
          },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          laborUnitId: { type: 'string' },
          params: reportParams,
        },
        required: ['reportId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_semantic_query',
      description:
        'Consulta ad hoc. SamiQuery: version 1, source semantic, dataset, metrics, dimensions, filters. Dimensiones sales: branch, category, product, day, customer, payment_method, weekday (1=lunes…7=domingo o “lunes”). Top clientes: metrics net_sales, dimensions [customer], orderBy desc.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'object', additionalProperties: true },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_report',
      description:
        'Genera Excel (xlsx) o PDF descargable a partir del último informe de la conversación o de un reportId. No inventes datos: primero corre un reporte si no hay tablas.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'pdf'] },
          reportId: { type: 'string', description: 'UUID del informe persistido (opcional)' },
        },
        required: ['format'],
        additionalProperties: false,
      },
    },
  },
];
