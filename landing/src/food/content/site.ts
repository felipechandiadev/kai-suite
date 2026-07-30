export type NavLink = { href: string; label: string };

export type StageDevice = {
  id: 'board' | 'waiter' | 'kds' | 'pos';
  app: string;
  shell: 'tv' | 'phone' | 'tablet' | 'desktop';
  caption: string;
  screenshot: string;
};

export type JourneyStep = {
  id: string;
  title: string;
  body: string;
  device: StageDevice['shell'];
  app: string;
};

export type RoleCard = {
  id: string;
  role: string;
  pain: string;
  relief: string;
};

export type Differentiator = {
  id: string;
  title: string;
  versus: string;
  body: string;
};

export type AppBrief = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  shell: StageDevice['shell'];
  screenshot: string;
};

export const SITE = {
  name: 'KaiFood',
  tagline: 'Sala, cocina y caja sincronizadas en multipantalla.',
  description:
    'KaiFood conecta meseros, cocina, TV de sala y POS en un solo flujo de pedido en tiempo real para restaurants chilenos.',
};

export const NAV: NavLink[] = [
  { href: '#journey', label: 'Flujo' },
  { href: '#devices', label: 'Pantallas' },
  { href: '#roles', label: 'Roles' },
  { href: '#diferencias', label: 'Por qué' },
  { href: '#apps', label: 'Apps' },
  { href: '#demo', label: 'Demo' },
];

export const HERO = {
  brand: 'KaiFood',
  title: 'La cocina, la sala y la caja, sincronizadas',
  subtitle:
    'Un pedido vive en cuatro pantallas a la vez: el mesero en el móvil, la cocina en tablet, la sala en el televisor y la caja en el computador.',
  primaryCta: { href: '#journey', label: 'Ver el flujo del pedido' },
};

export const STAGE_DEVICES: StageDevice[] = [
  {
    id: 'board',
    app: 'Board',
    shell: 'tv',
    caption: 'TV de sala — listos para retirar',
    screenshot: '/food/screenshots/board.jpg',
  },
  {
    id: 'waiter',
    app: 'Waiter',
    shell: 'phone',
    caption: 'Móvil del mesero — mesas y comanda',
    screenshot: '/food/screenshots/waiter.png',
  },
  {
    id: 'kds',
    app: 'KDS',
    shell: 'tablet',
    caption: 'Tablet de cocina — fires por estación',
    screenshot: '/food/screenshots/kds.jpg',
  },
  {
    id: 'pos',
    app: 'POS',
    shell: 'desktop',
    caption: 'PC de caja — barra, mesa y takeaway',
    screenshot: '/food/screenshots/pos.jpg',
  },
];

export const ORDER_JOURNEY: JourneyStep[] = [
  {
    id: 'fire',
    title: 'Mesero envía el fire',
    body: 'Desde el móvil, la comanda sale a cocina con número de pedido y notas. Sin papel, sin gritos.',
    device: 'phone',
    app: 'Waiter',
  },
  {
    id: 'cook',
    title: 'Cocina prepara en KDS',
    body: 'La tablet muestra el fire por estación. Al marcar listo, el resto del local se entera al instante.',
    device: 'tablet',
    app: 'KDS',
  },
  {
    id: 'ready',
    title: 'Sala ve lo listo',
    body: 'El televisor anuncia pedidos listos para retirar; el mesero recibe aviso de lo que él envió.',
    device: 'tv',
    app: 'Board',
  },
  {
    id: 'serve',
    title: 'Entrega y cobro',
    body: 'Se marca entregado en mesa o se cobra en POS. Un solo Core, sin planillas paralelas.',
    device: 'desktop',
    app: 'POS',
  },
];

export const ROLES: RoleCard[] = [
  {
    id: 'owner',
    role: 'Dueño / gerente',
    pain: 'No ves si la cocina se atrasó o si la sala dejó pedidos colgados.',
    relief: 'Un flujo visible de punta a punta: fire → listo → entregado, en todas las pantallas.',
  },
  {
    id: 'cashier',
    role: 'Cajero / barra',
    pain: 'Tickets perdidos entre mostrador, takeaway y mesas.',
    relief: 'POS en computador con la misma cuenta que ve cocina y sala.',
  },
  {
    id: 'waiter',
    role: 'Mesero',
    pain: 'Correr a cocina a preguntar si ya salió el plato.',
    relief: 'Móvil con mesas, comanda y aviso cuando cocina está lista.',
  },
  {
    id: 'kitchen',
    role: 'Cocina',
    pain: 'Comandas ilegibles y estaciones sin prioridad clara.',
    relief: 'KDS en tablet: fires claros, estados y estaciones sin papel.',
  },
];

export const DIFFERENTIATORS: Differentiator[] = [
  {
    id: 'comanda',
    title: 'Comanda digital en vivo',
    versus: 'Gritos y papel',
    body: 'El fire nace en Waiter o POS y aparece en KDS sin reescribir nada.',
  },
  {
    id: 'board',
    title: 'Board en televisor',
    versus: 'Carteles o pizarra',
    body: 'La sala ve qué está listo para retirar; el mostrador no depende del WhatsApp del turno.',
  },
  {
    id: 'waiter-device',
    title: 'Mesero en el bolsillo',
    versus: 'Una tablet compartida',
    body: 'Cada mesero opera su móvil: mesas, cuenta y entregado de lo que envió.',
  },
  {
    id: 'kds-station',
    title: 'KDS por estación',
    versus: 'Una sola pantalla genérica',
    body: 'Cocina trabaja por fires y estaciones, alineado al ritmo real del local.',
  },
];

export const APPS_BRIEF: AppBrief[] = [
  {
    id: 'waiter',
    name: 'Waiter',
    tagline: 'Mesero',
    description: 'Mesas, menú, envío a cocina y marcar entregado.',
    shell: 'phone',
    screenshot: '/food/screenshots/waiter.png',
  },
  {
    id: 'kds',
    name: 'KDS',
    tagline: 'Cocina',
    description: 'Comandas por estación, estados y fires en tiempo real.',
    shell: 'tablet',
    screenshot: '/food/screenshots/kds.jpg',
  },
  {
    id: 'board',
    name: 'Board',
    tagline: 'Sala / TV',
    description: 'Pantalla de listos para retirar, visible para toda la sala.',
    shell: 'tv',
    screenshot: '/food/screenshots/board.jpg',
  },
  {
    id: 'pos',
    name: 'POS',
    tagline: 'Caja',
    description: 'Barra, mesa y takeaway en el computador de caja.',
    shell: 'desktop',
    screenshot: '/food/screenshots/pos.jpg',
  },
  {
    id: 'admin',
    name: 'Admin',
    tagline: 'Gestión',
    description: 'Catálogo, sucursales, usuarios y SII cuando lo activas.',
    shell: 'desktop',
    screenshot: '/food/screenshots/admin.svg',
  },
];

export const CTA = {
  title: 'Menos gritos. Más ritmo en el local.',
  body: 'KaiFood orquesta Waiter, KDS, Board y POS sobre el mismo Core Kai — hecho para restaurants en Chile.',
  primary: { href: 'mailto:contacto@kaifood.cl', label: 'Agendar demo' },
  secondary: { href: '#apps', label: 'Ver apps' },
};
