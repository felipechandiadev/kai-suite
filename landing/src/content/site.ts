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
  tagline: 'Plataforma comercial para retail chileno.',
  description:
    'Kai conecta caja, backoffice, inventario y tienda online en un ecosistema multi-empresa: ERP, POS, eShop y agentes locales con SII opcional bien integrado.',
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
    'ERP, punto de venta, inventario, eShop e impresión local — pensado para el mostrador chileno. Una sola implementación de Kai puede dar servicio a varias empresas, cada una con sus sucursales y cajas.',
  secondaryCta: { href: '#ecosistema', label: 'Ver ecosistema' },
};

export const HERO_TABS = [
  {
    id: 'pos',
    label: 'POS',
    title: 'Caja — vende y cobra',
    caption: 'Carrito ágil, sesión de caja, offline y boleta opcional al SII.',
    screenshot: '/screenshots/pos.svg',
    accent: '#04c9e6',
  },
  {
    id: 'admin',
    label: 'Admin',
    title: 'ERP — controla tu negocio',
    caption: 'Catálogo, compras, tesorería, contabilidad y configuración.',
    screenshot: '/screenshots/admin.svg',
    accent: '#0a7cad',
  },
  {
    id: 'eshop',
    label: 'eShop',
    title: 'Tienda online — vende en la web',
    caption: 'Catálogo público, carrito y pedidos integrados al inventario.',
    screenshot: '/screenshots/eshop.svg',
    accent: '#18B3D6',
  },
] as const;

export type MarqueeItem = {
  label: string;
  screenshot: string;
};

export const MARQUEE_ITEMS: MarqueeItem[] = [
  { label: 'Admin', screenshot: '/screenshots/admin.svg' },
  { label: 'POS', screenshot: '/screenshots/pos.svg' },
  { label: 'Stock', screenshot: '/screenshots/stock.svg' },
  { label: 'eShop', screenshot: '/screenshots/eshop.svg' },
  { label: 'Kai Printers', screenshot: '/screenshots/printers.svg' },
  { label: 'Kai Screen', screenshot: '/screenshots/screen.svg' },
];

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
    apps: ['Stock', 'Admin'],
  },
  {
    id: 'digital',
    title: 'Canal digital',
    summary: 'Tienda pública por empresa, integrada al mismo catálogo y pedidos.',
    apps: ['eShop'],
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
    'Si contratas Kai y tienes varias tiendas o razones sociales, las gestionas todas juntas en un solo lugar: una implementación, un ecosistema de apps y cada empresa con sus datos, usuarios y configuración propios.',
  models: [
    {
      audience: 'Un solo despliegue',
      title: 'No instalas Kai por cada tienda',
      summary:
        'Da de alta todas tus empresas retail en la misma instancia. Mismo Admin, POS, Stock y eShop — sin duplicar servidores ni sistemas por separado.',
      bullets: [
        'Una implementación de Kai para todo tu grupo.',
        'Alta de empresas, sucursales y cajas desde el mismo panel.',
        'Misma operación para tiendas propias o marcas distintas.',
      ],
    },
    {
      audience: 'Datos separados',
      title: 'Cada empresa con su información',
      summary:
        'Catálogo, inventario, contabilidad y permisos van aislados por empresa. Lo de una tienda no se mezcla con otra.',
      bullets: [
        'Usuarios y roles configurados por empresa.',
        'Ventas, stock y caja propios de cada negocio.',
        'eShop público por empresa — no es un marketplace.',
      ],
    },
    {
      audience: 'Día a día',
      title: 'Cambias de empresa sin salir de Kai',
      summary:
        'En Admin y POS eliges la empresa activa de tu sesión y sigues trabajando. Ideal si administras varias tiendas desde un solo equipo.',
      bullets: [
        'Selector de empresa en las apps autenticadas.',
        'Reportes y operación en el contexto correcto.',
        'Dentro de cada empresa: multi-sucursal y multi-caja incluidos.',
      ],
    },
  ] satisfies MultiEmpresaModel[],
  note:
    'Multi-sucursal y multi-caja aplican dentro de cada empresa (varios locales bajo la misma razón social). Multi-empresa es cuando tienes varias razones sociales o marcas en el mismo Kai.',
};

export const PILLARS_SECTION = {
  eyebrow: 'Producto en acción',
  title: 'Cuatro pilares del ecosistema',
  intro:
    'POS en el mostrador, Admin en la oficina, Stock en bodega y eShop en la web — cuatro frentes sobre el mismo catálogo, inventario y contabilidad.',
  support:
    'Kai Core unifica los datos entre pilares. Kai Printers y Kai Screen potencian el mostrador; SII es opcional cuando el negocio lo necesita.',
};

export const PILLARS: Pillar[] = [
  {
    id: 'pos',
    eyebrow: 'POS',
    title: 'La caja que no se detiene',
    body: 'Venta rápida, sesiones de caja, medios de pago y modo offline. Boleta SII cuando la activas — en el mismo flujo de cobro.',
    bullets: [
      'Carrito y cobro optimizados para mostrador.',
      'Offline-first: vende sin WiFi y sincroniza después.',
      'Sesiones de caja, arqueos y trazabilidad.',
      'Impresión local vía Kai Printers.',
    ],
    screenshot: '/screenshots/pos.svg',
    accent: '#04c9e6',
  },
  {
    id: 'admin',
    eyebrow: 'Admin',
    title: 'El ERP que acompaña el crecimiento',
    body: 'Un panel para catálogo, compras, tesorería, contabilidad y configuración. De una sucursal a varias, o varias empresas en el mismo Kai.',
    bullets: [
      'Inventario central y productos con variantes.',
      'Cuentas por pagar y motor contable.',
      'Multi-sucursal y multi-caja dentro de tu empresa.',
      'Multi-empresa: gestiona varias tiendas desde un solo Kai.',
      'SII opcional integrado al flujo de venta.',
    ],
    screenshot: '/screenshots/admin.svg',
    accent: '#0a7cad',
  },
  {
    id: 'stock',
    eyebrow: 'Stock',
    title: 'Inventario donde ocurre',
    body: 'Operaciones en bodega y piso de venta: consultas, conteos y movimientos sin volver a la oficina.',
    bullets: [
      'Tablet o móvil en el almacén.',
      'Consulta por SKU y existencias por bodega.',
      'Movimientos y ajustes en terreno.',
      'Mismo dato que Admin y POS.',
    ],
    screenshot: '/screenshots/stock.svg',
    accent: '#65F3FF',
  },
  {
    id: 'eshop',
    eyebrow: 'eShop',
    title: 'Canal digital integrado',
    body: 'Tienda pública por empresa. No es un marketplace: es tu catálogo online conectado al inventario real.',
    bullets: [
      'Catálogo y checkout en la web.',
      'Pedidos que impactan stock y gestión.',
      'Una tienda por empresa.',
      'Misma base de productos que el mostrador.',
    ],
    screenshot: '/screenshots/eshop.svg',
    accent: '#18B3D6',
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
    screenshot: '/screenshots/admin.svg',
    accent: '#0a7cad',
  },
  {
    id: 'pos',
    name: 'POS',
    tagline: 'Punto de venta',
    description: 'Caja en mostrador: carrito, cobro, sesión de caja, impresión y venta offline.',
    users: 'Cajero, vendedor',
    highlights: ['Offline-first', 'Sesión de caja', 'Boleta opcional', 'Kai Printers'],
    pwa: true,
    screenshot: '/screenshots/pos.svg',
    accent: '#04c9e6',
  },
  {
    id: 'printers',
    name: 'Kai Printers',
    tagline: 'Agente de impresión',
    description:
      'Agente local ESC/POS para tickets y boletas. Recibe trabajos por WebSocket desde el POS e imprime directo a la impresora térmica.',
    users: 'Operación de caja',
    highlights: ['ESC/POS', 'WebSocket', 'Cola estable', 'Red local'],
    platforms: [
      { id: 'android', label: 'Android' },
      { id: 'windows', label: 'Windows' },
      { id: 'macos', label: 'macOS' },
    ],
    screenshot: '/screenshots/printers.svg',
    accent: '#04c9e6',
  },
  {
    id: 'stock',
    name: 'Stock',
    tagline: 'Inventario móvil',
    description: 'Operaciones de inventario en piso: consultas, conteos y movimientos.',
    users: 'Bodeguero, encargado de tienda',
    highlights: ['Consulta SKU', 'Movimientos', 'Sincronizado con Admin'],
    pwa: true,
    platforms: MOBILE_PLATFORMS,
    screenshot: '/screenshots/stock.svg',
    accent: '#65F3FF',
  },
  {
    id: 'eshop',
    name: 'eShop',
    tagline: 'Tienda online',
    description: 'Catálogo y pedidos públicos por empresa, conectados al mismo inventario.',
    users: 'Cliente final',
    highlights: ['Marca propia', 'Carrito y pedidos', 'Tema configurable', 'Mismo catálogo'],
    screenshot: '/screenshots/eshop.svg',
    accent: '#18B3D6',
  },
  {
    id: 'screen',
    name: 'Kai Screen',
    tagline: 'Pantalla cliente',
    description: 'Display orientado al comprador en mostrador: total, mensajes y branding.',
    users: 'Experiencia en caja',
    highlights: ['Sync con POS', 'Branding tienda', 'Segunda pantalla'],
    platforms: [{ id: 'android', label: 'Android' }],
    screenshot: '/screenshots/screen.svg',
    accent: '#0a7cad',
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
    name: 'Stock en tiempo real',
    short: 'Stock',
    description: 'Existencias por bodega actualizadas con cada venta, recepción o ajuste.',
  },
  {
    id: 'caja',
    name: 'Cierre de caja',
    short: 'Caja',
    description: 'Arqueos, medios de pago y sesiones por cajero y punto de venta.',
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
      apps: ['POS', 'Admin', 'Stock', 'Kai Printers'],
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
    metric: 'Admin · POS · Stock',
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
    'Vendes, cobras, imprimes, actualizas stock y reportas — todo conectado al mismo dato.',
  core: {
    label: 'Kai Core',
    sub: 'Backend compartido multi-empresa',
    pills: ['Multi-empresa', 'API · Auth', 'SII opcional'],
  },
  channels: [
    { id: 'pos', label: 'POS', sub: 'Caja · vende y cobra', accent: '#04c9e6' },
    { id: 'eshop', label: 'eShop', sub: 'Tienda online', accent: '#18B3D6' },
  ],
  agents: {
    label: 'Agentes locales',
    sub: 'Impresión y pantalla cliente',
    items: ['Kai Printers', 'Kai Screen'],
  },
  satellites: [
    { id: 'admin', label: 'Admin', sub: 'ERP web', accent: '#0a7cad' },
    { id: 'stock', label: 'Stock', sub: 'Inventario móvil', accent: '#65F3FF' },
  ],
  flowSteps: [
    { id: 'vender', label: 'Vender', sub: 'POS · eShop', icon: 'cart' as const },
    { id: 'cobrar', label: 'Cobrar', sub: 'Sesión de caja', icon: 'cash' as const },
    { id: 'imprimir', label: 'Imprimir', sub: 'Kai Printers', icon: 'print' as const },
    { id: 'stock', label: 'Stock', sub: 'Inventario', icon: 'boxes' as const },
    { id: 'reportar', label: 'Reportar', sub: 'Ventas · Admin', icon: 'chart' as const },
  ],
};

export const CTA = {
  title: 'Menos planillas. Más control en tu tienda.',
  body: 'Conoce cómo KaiStore integra caja, gestión e inventario en un ecosistema hecho para retail chileno.',
  primary: { href: 'mailto:contacto@kaistore.cl', label: 'Contactar' },
  secondary: { href: '#modulos', label: 'Explorar módulos' },
};
