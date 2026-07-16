export type NavLink = { href: string; label: string };

export type AppPlatform = {
  id: 'android' | 'windows' | 'macos' | 'ios';
  label: string;
};

export const PWA_PLATFORMS: AppPlatform[] = [
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
];

/** Apps móviles (sin desktop nativo) */
export const MOBILE_PLATFORMS: AppPlatform[] = [
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
];

export type AppModule = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  users: string;
  highlights: string[];
  screenshot: string;
  accent: string;
  /** App web instalable (PWA) en tablet, PC y móvil */
  pwa?: boolean;
  platforms?: AppPlatform[];
};

export type Layer = {
  id: string;
  title: string;
  summary: string;
  apps: string[];
};

export type Indicator = {
  id: string;
  name: string;
  short: string;
  description: string;
  range?: string;
};

export type Pillar = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  screenshot: string;
  accent: string;
};

export type BentoCell = {
  title: string;
  metric?: string;
  badge?: string;
  description: string;
};

export type CompliancePillar = {
  law: string;
  title: string;
  summary: string;
  apps: string[];
};

export type MultiEmpresaModel = {
  audience: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const SITE = {
  name: 'Kai',
  tagline: 'Retail chileno: caja, web, stock y reparto en un ecosistema.',
  description:
    'Kai conecta POS, ERP, inventario, eShop y reparto local multi-canal: un motor de Delivery, app Kai Delivery para repartidores y SII opcional bien integrado.',
};

export const NAV: NavLink[] = [
  { href: '#capas', label: 'Capas' },
  { href: '#multi-empresa', label: 'Multi-empresa' },
  { href: '#ecosistema', label: 'Ecosistema' },
  { href: '#pilares', label: 'Pilares' },
  { href: '#modulos', label: 'Módulos' },
  { href: '#indicadores', label: 'Resultados' },
  { href: '#sii', label: 'SII' },
  { href: '#plataforma', label: 'Plataforma' },
];

export const HERO = {
  brand: 'KaiStore',
  title: 'Tu tienda física y digital en un solo ecosistema',
  subtitle:
    'ERP, POS, inventario, eShop, impresión y reparto local — del mostrador a la puerta del cliente. Pedidos POS y eShop alimentan el mismo tablero de Delivery; los repartidores operan en Kai Delivery.',
  secondaryCta: { href: '#ecosistema', label: 'Ver ecosistema' },
};

export const LAYERS: Layer[] = [
  {
    id: 'mostrador',
    title: 'Capa mostrador',
    summary: 'Venta, cobro e impresión en caja — con o sin conexión a internet.',
    apps: ['POS', 'Kai Printers', 'Kai Screen', 'Kai Scale'],
  },
  {
    id: 'gestion',
    title: 'Capa gestión',
    summary: 'Backoffice ERP: ventas, compras, finanzas, RRHH y configuración.',
    apps: ['Admin'],
  },
  {
    id: 'inventario',
    title: 'Capa inventario',
    summary: 'Stock en piso y catálogo centralizado por sucursal.',
    apps: ['StockControl', 'Admin'],
  },
  {
    id: 'digital',
    title: 'Canal digital',
    summary: 'Tienda pública por empresa, integrada al mismo catálogo y pedidos.',
    apps: ['eShop'],
  },
  {
    id: 'logistica',
    title: 'Capa logística',
    summary:
      'Reparto local multi-canal: pedidos desde POS o eShop, tablero de repartos en Admin y entrega en ruta con Kai Delivery.',
    apps: ['Admin · Delivery', 'Kai Delivery', 'POS', 'eShop'],
  },
  {
    id: 'core',
    title: 'Kai Core',
    summary: 'Backend compartido multi-empresa: varias tiendas aisladas, multi-sucursal y SII opcional.',
    apps: ['API', 'Multi-tenant', 'Contabilidad', 'Auth'],
  },
];

export const MULTI_EMPRESA = {
  eyebrow: 'Multi-empresa',
  title: 'Un Kai, varias empresas',
  intro:
    'Varias tiendas o razones sociales en una sola implementación: mismo ecosistema, datos y usuarios por empresa.',
  models: [
    {
      audience: 'Un solo despliegue',
      title: 'No instalas Kai por cada tienda',
      summary: 'Todas tus empresas retail en la misma instancia — Admin, POS, StockControl y eShop compartidos.',
      bullets: [
        'Alta de empresas, sucursales y cajas desde un panel.',
        'Misma operación para marcas distintas.',
      ],
    },
    {
      audience: 'Datos separados',
      title: 'Cada empresa con su información',
      summary: 'Catálogo, inventario, contabilidad y permisos aislados. Lo de una tienda no se mezcla con otra.',
      bullets: [
        'Usuarios y roles por empresa.',
        'eShop propio — no es marketplace.',
      ],
    },
    {
      audience: 'Día a día',
      title: 'Cambias de empresa sin salir de Kai',
      summary: 'En Admin y POS eliges la empresa activa y sigues operando.',
      bullets: [
        'Selector de empresa en sesión.',
        'Multi-sucursal y multi-caja dentro de cada empresa.',
      ],
    },
  ] satisfies MultiEmpresaModel[],
  note:
    'Multi-sucursal/caja = locales de la misma razón social. Multi-empresa = varias razones o marcas en el mismo Kai.',
};

export const PILLARS_SECTION = {
  eyebrow: 'Producto en acción',
  title: 'Cuatro pilares del ecosistema',
  intro:
    'POS en el mostrador, Admin en la oficina, StockControl en bodega y eShop en la web — cuatro frentes sobre el mismo catálogo, inventario y contabilidad. El reparto local opera sobre esos pilares: captura en POS o eShop, preparación en Admin y entrega en Kai Delivery.',
  support:
    'Kai Core unifica los datos. Kai Printers y Kai Screen potencian el mostrador; Delivery coordina la última milla multi-canal; SII es opcional cuando el negocio lo necesita.',
};

export const PILLARS: Pillar[] = [
  {
    id: 'pos',
    eyebrow: 'POS',
    title: 'La caja que no se detiene',
    body: 'Venta rápida, sesiones de caja, medios de pago y modo offline. Boleta SII cuando la activas — y reparto local en el mismo flujo de cobro cuando tu cliente lo necesita.',
    bullets: [
      'Carrito y cobro optimizados para mostrador.',
      'Offline-first: vende sin WiFi y sincroniza después.',
      'Sesiones de caja, arqueos y trazabilidad.',
      'Pedido de reparto desde la venta de caja (mismo motor que eShop).',
      'Impresión local vía Kai Printers.',
    ],
    screenshot: '/screenshots/pos.png',
    accent: '#1e73ae',
  },
  {
    id: 'admin',
    eyebrow: 'Admin',
    title: 'El ERP que acompaña el crecimiento',
    body: 'Un panel para catálogo, compras, tesorería, contabilidad y configuración — más el menú Delivery: tablero de repartos, franjas, zonas y ruta del día.',
    bullets: [
      'Inventario central y productos con variantes.',
      'Cuentas por pagar y motor contable.',
      'Multi-sucursal y multi-caja dentro de tu empresa.',
      'Tablero de repartos: preparación, despacho e incidencias.',
      'Multi-empresa: gestiona varias tiendas desde un solo Kai.',
      'SII opcional integrado al flujo de venta.',
    ],
    screenshot: '/screenshots/admin.png',
    accent: '#02578b',
  },
  {
    id: 'stock',
    eyebrow: 'StockControl',
    title: 'Inventario donde ocurre',
    body: 'Operaciones en bodega y piso de venta: consultas, conteos y movimientos sin volver a la oficina.',
    bullets: [
      'Tablet o móvil en el almacén.',
      'Consulta por SKU y existencias por bodega.',
      'Movimientos y ajustes en terreno.',
      'Mismo dato que Admin y POS.',
    ],
    screenshot: '/screenshots/stock.svg',
    accent: '#00deef',
  },
  {
    id: 'eshop',
    eyebrow: 'eShop',
    title: 'Canal digital integrado',
    body: 'Tienda pública por empresa. No es un marketplace: es tu catálogo online conectado al inventario real — con retiro en local o reparto al mismo tablero operativo.',
    bullets: [
      'Catálogo y checkout en la web.',
      'Retiro o reparto local según tu cobertura.',
      'Pedidos que alimentan el motor Delivery (mismo que POS).',
      'Una tienda por empresa.',
      'Misma base de productos que el mostrador.',
    ],
    screenshot: '/screenshots/eshop.png',
    accent: '#1e73ae',
  },
];

export const MODULES: AppModule[] = [
  {
    id: 'admin',
    name: 'Admin',
    tagline: 'ERP web',
    description: 'Panel de gestión: catálogo, compras, tesorería, contabilidad, RRHH y configuración.',
    users: 'Dueño, administración, contador interno',
    highlights: ['Multi-empresa', 'Multi-sucursal', 'CxP y contabilidad', 'SII opcional'],
    pwa: true,
    screenshot: '/screenshots/admin.png',
    accent: '#02578b',
  },
  {
    id: 'pos',
    name: 'POS',
    tagline: 'Punto de venta',
    description: 'Caja en mostrador: carrito, cobro, sesión de caja, impresión y venta offline.',
    users: 'Cajero, vendedor',
    highlights: ['Offline-first', 'Sesión de caja', 'Boleta opcional', 'Kai Printers'],
    pwa: true,
    screenshot: '/screenshots/pos-module.png',
    accent: '#1e73ae',
  },
  {
    id: 'stock',
    name: 'StockControl',
    tagline: 'Inventario móvil',
    description: 'Operaciones de inventario en piso: consultas, conteos y movimientos.',
    users: 'Bodeguero, encargado de tienda',
    highlights: ['Consulta SKU', 'Movimientos', 'Sincronizado con Admin'],
    pwa: true,
    platforms: MOBILE_PLATFORMS,
    screenshot: '/screenshots/stock.svg',
    accent: '#00deef',
  },
  {
    id: 'eshop',
    name: 'eShop',
    tagline: 'Tienda online',
    description: 'Catálogo y pedidos públicos por empresa, conectados al mismo inventario y al motor de Delivery.',
    users: 'Cliente final',
    highlights: ['Marca propia', 'Carrito y pedidos', 'Reparto o retiro', 'Mismo catálogo'],
    screenshot: '/screenshots/eshop-module.png',
    accent: '#1e73ae',
  },
  {
    id: 'delivery',
    name: 'Kai Delivery',
    tagline: 'App repartidores',
    description:
      'PWA para la ruta del día: paradas, mapa, inicio de reparto y estados de entrega. Un motor de Delivery alimentado por pedidos POS y eShop; el courier opera en terreno.',
    users: 'Repartidor',
    highlights: ['Paradas del día', 'Mapa y secuencia', 'Estados de entrega', 'Multi-canal POS · eShop'],
    pwa: true,
    platforms: MOBILE_PLATFORMS,
    screenshot: '/screenshots/delivery.svg',
    accent: '#02578b',
  },
];

export const INDICATORS: Indicator[] = [
  {
    id: 'ventas',
    name: 'Ventas consolidadas',
    short: 'Ventas',
    description: 'Ingresos por sucursal, POS y canal — mostrador y eShop en un solo reporte.',
  },
  {
    id: 'stock',
    name: 'Inventario en tiempo real',
    short: 'StockControl',
    description: 'Existencias por bodega actualizadas con cada venta, recepción o ajuste.',
  },
  {
    id: 'caja',
    name: 'Cierre de caja',
    short: 'Caja',
    description: 'Arqueos, medios de pago y sesiones por cajero y punto de venta.',
  },
  {
    id: 'repartos',
    name: 'Repartos del día',
    short: 'Delivery',
    description:
      'Pedidos POS y eShop en un tablero: preparación, ruta, paradas y estados hasta la entrega.',
  },
  {
    id: 'margen',
    name: 'Compras vs ventas',
    short: 'Margen',
    description: 'Visibilidad de compras, cuentas por pagar y costo de mercadería vendida.',
  },
  {
    id: 'sii',
    name: 'Emisión SII',
    short: 'SII',
    description: 'Boletas electrónicas trazables cuando el módulo está activo — folios por caja.',
  },
  {
    id: 'offline',
    name: 'Continuidad operativa',
    short: 'Offline',
    description: 'Ventas registradas sin red y sincronizadas al reconectar, sin duplicar folios.',
  },
];

export const COMPLIANCE = {
  eyebrow: 'Cumplimiento tributario',
  title: 'SII opcional — bien integrado cuando lo activas',
  intro:
    'No necesitas conectar el SII desde el día uno. Kai funciona completo para caja, stock y ERP con ticket de venta. Cuando tu negocio lo requiera, activas boletas electrónicas en el mismo flujo de cobro.',
  note:
    'Compras con DTE proveedor, contabilidad y cuentas por pagar funcionan en Admin independientemente de si el POS emite boletas de venta.',
  pillars: [
    {
      law: 'Sin SII',
      title: 'Operación inmediata',
      summary:
        'Piloto o tienda que arranca con ticket interno: POS, inventario, impresión y ERP sin certificado ni CAF.',
      apps: ['POS', 'Admin', 'StockControl', 'Kai Printers'],
    },
    {
      law: 'Con SII',
      title: 'Boleta en el cobro',
      summary:
        'DTE tipo 39 en el momento de la venta, folios por caja, timbre PDF417 en impresión y cola de envío al reconectar.',
      apps: ['POS', 'Admin', 'SII', 'Kai Printers'],
    },
  ] satisfies CompliancePillar[],
  focusHighlight:
    'La integración no es un plugin aparte: la venta, el stock y la contabilidad comparten el mismo registro — con o sin emisión fiscal.',
};

export const BENTO: BentoCell[] = [
  {
    title: 'Offline-first',
    metric: 'POS',
    badge: 'RETAIL',
    description: 'Vende e imprime sin internet; sincronización idempotente al reconectar.',
  },
  {
    title: 'Multi-empresa',
    metric: 'Kai Core',
    badge: 'TENANT',
    description:
      'Una implementación, varias empresas retail: datos aislados, usuarios por empresa y mismo ecosistema de apps.',
  },
  {
    title: 'Reparto multi-canal',
    metric: 'Delivery',
    badge: 'RUTA',
    description:
      'Pedidos desde POS o eShop alimentan el mismo tablero; Kai Delivery lleva la ruta del día al repartidor.',
  },
  {
    title: 'Multi-sucursal',
    metric: 'ERP',
    description: 'Dentro de cada empresa: sucursales, bodegas y varios puntos de venta.',
  },
  {
    title: 'Impresión local',
    metric: 'WebSocket',
    badge: 'LIVE',
    description: 'Kai Printers en Android, Windows y macOS — cola estable en hora punta.',
  },
  {
    title: 'Instalable',
    metric: 'Admin · POS · StockControl · Delivery',
    description: 'Apps web instalables en tablet, PC y móvil sin tiendas de aplicaciones.',
  },
  {
    title: 'Contabilidad',
    metric: 'Motor',
    description: 'Asientos automáticos desde transacciones tipadas de venta, compra y nómina.',
  },
  {
    title: 'Un backend',
    metric: 'NestJS',
    description: 'API compartida: multi-tenant, contabilidad y módulos para todas las apps Kai.',
  },
];

export const ECOSYSTEM = {
  eyebrow: 'Ecosistema',
  title: 'Un flujo continuo de retail',
  intro:
    'Vendes, cobras, imprimes, preparas, entregas, actualizas stock y reportas — todo conectado al mismo dato. Un motor de Delivery, canales POS y eShop.',
  flowSteps: [
    { id: 'vender', label: 'Vender', sub: 'POS · eShop', icon: 'cart' as const },
    { id: 'cobrar', label: 'Cobrar', sub: 'Sesión de caja', icon: 'cash' as const },
    { id: 'imprimir', label: 'Imprimir', sub: 'Kai Printers', icon: 'print' as const },
    { id: 'preparar', label: 'Preparar', sub: 'Admin · Repartos', icon: 'prepare' as const },
    { id: 'entregar', label: 'Entregar', sub: 'Kai Delivery', icon: 'truck' as const },
    { id: 'stock', label: 'StockControl', sub: 'Inventario', icon: 'boxes' as const },
    { id: 'reportar', label: 'Reportar', sub: 'Ventas · Admin', icon: 'chart' as const },
  ],
};

export const CTA = {
  title: 'Menos planillas. Más control hasta la puerta.',
  body: 'Conoce cómo KaiStore integra caja, gestión, inventario, eShop y reparto local en un ecosistema hecho para retail chileno.',
  primary: { href: 'mailto:contacto@kaistore.cl', label: 'Contactar' },
  secondary: { href: '#modulos', label: 'Explorar módulos' },
};
