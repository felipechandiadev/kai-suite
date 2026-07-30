import { uiComponentItems } from '@/navigation/mainMenu';

export type DesignSystemNavItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

export type DesignSystemNavSection = {
  id: string;
  label: string;
  href?: string;
  items: DesignSystemNavItem[];
};

export const designSystemHubSections = [
  {
    id: 'examples',
    title: 'Ejemplos en contexto',
    description: 'Cards, KPIs, formularios y bandejas compuestos — visualiza el design system en situaciones reales del ERP.',
    href: '/design-system/examples',
  },
  {
    id: 'foundations',
    title: 'Foundations',
    description: 'Tokens, tipografía, espaciado, bordes e interacción. Base visual compartida entre PWAs.',
    href: '/design-system/foundations/colors',
  },
  {
    id: 'patterns',
    title: 'Patrones',
    description: 'Layouts de página, colecciones con DataGrid, formularios y feedback al usuario.',
    href: '/design-system/patterns',
  },
  {
    id: 'components',
    title: 'Componentes',
    description: 'Galería interactiva de primitivos @kai/ui con variantes y ejemplos en contexto.',
    href: '/design-system/components',
  },
  {
    id: 'governance',
    title: 'Gobernanza',
    description: 'Reglas de uso, límites @kai/ui vs dominio y checklist para nuevas pantallas.',
    href: '/design-system/governance',
  },
] as const;

export const designSystemSections: DesignSystemNavSection[] = [
  {
    id: 'overview',
    label: 'Inicio',
    href: '/design-system',
    items: [{ id: 'home', label: 'Resumen', href: '/design-system' }],
  },
  {
    id: 'examples',
    label: 'Ejemplos',
    href: '/design-system/examples',
    items: [
      {
        id: 'examples-in-context',
        label: 'En contexto',
        href: '/design-system/examples',
        description: 'Cards, KPIs, formularios compuestos',
      },
    ],
  },
  {
    id: 'foundations',
    label: 'Foundations',
    href: '/design-system/foundations/colors',
    items: [
      {
        id: 'colors',
        label: 'Colores',
        href: '/design-system/foundations/colors',
        description: 'Tokens --color-* y reglas semánticas',
      },
      {
        id: 'typography',
        label: 'Tipografía',
        href: '/design-system/foundations/typography',
        description: 'Inter, jerarquía h1–body, muted',
      },
      {
        id: 'spacing-borders',
        label: 'Espaciado y bordes',
        href: '/design-system/foundations/spacing-and-borders',
        description: 'gap, padding shell, color-mix en líneas',
      },
      {
        id: 'interaction',
        label: 'Interacción',
        href: '/design-system/foundations/interaction',
        description: 'Hover, focus-visible, active, disabled',
      },
    ],
  },
  {
    id: 'patterns',
    label: 'Patrones',
    href: '/design-system/patterns',
    items: [
      {
        id: 'page-layouts',
        label: 'Layouts de página',
        href: '/design-system/patterns/page-layouts',
        description: 'Basic, Tab y Collection',
      },
      {
        id: 'data-collection',
        label: 'Colecciones y DataGrid',
        href: '/design-system/patterns/data-collection',
        description: 'Listados ERP, header grid, fill viewport',
      },
      {
        id: 'forms-feedback',
        label: 'Formularios y feedback',
        href: '/design-system/patterns/forms-feedback',
        description: 'Inputs, validación, Alert, Dialog',
      },
    ],
  },
  {
    id: 'components',
    label: 'Componentes',
    href: '/design-system/components',
    items: buildComponentNavItems(),
  },
  {
    id: 'governance',
    label: 'Gobernanza',
    href: '/design-system/governance',
    items: [
      {
        id: 'rules',
        label: 'Reglas de uso',
        href: '/design-system/governance',
        description: '@kai/ui, tokens, Server Actions',
      },
    ],
  },
];

function buildComponentNavItems(): DesignSystemNavItem[] {
  const showcaseById = new Map(
    uiComponentItems
      .filter((item): item is typeof item & { url: string } => Boolean(item.url))
      .map((item) => [item.id, item]),
  );

  const groups: { ids: string[]; prefix?: string }[] = [
    {
      ids: ['ui-alert', 'ui-badge', 'ui-dot-progress'],
    },
    {
      ids: ['ui-button', 'ui-icon-button'],
    },
    {
      ids: ['ui-textfield', 'ui-select', 'ui-autocomplete', 'ui-switch', 'ui-number-stepper', 'ui-range-slider'],
    },
    {
      ids: ['ui-dialog'],
    },
    {
      ids: ['ui-tabs', 'ui-stepper', 'ui-calendar'],
    },
    {
      ids: ['ui-cards'],
    },
    {
      ids: ['ui-datagrid'],
    },
    {
      ids: ['ui-basic-page-layout', 'ui-tab-page-layout', 'ui-collection-page-layout'],
    },
    {
      ids: ['ui-multimedia'],
    },
  ];

  const ordered: DesignSystemNavItem[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const id of group.ids) {
      const item = showcaseById.get(id);
      if (!item?.url || seen.has(id)) continue;
      seen.add(id);
      ordered.push({
        id: item.id ?? id,
        label: item.label,
        href: item.url,
      });
    }
  }

  for (const item of uiComponentItems) {
    if (!item.url || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    ordered.push({ id: item.id, label: item.label, href: item.url });
  }

  return ordered;
}

export function flattenDesignSystemNav(): DesignSystemNavItem[] {
  return designSystemSections.flatMap((section) => section.items);
}
