import { ProductType } from '@modules/products/domain/product.entity';

/** Categorías multi-rubro (sin vidrios / parabrisas). */
export const SEED_DEV_CATEGORIES = [
  'Alimentos y bebidas',
  'Insumos cocina',
  'Pastelería',
  'Comida rápida',
  'Textil y vestuario',
  'Hogar y limpieza',
  'Tecnología y oficina',
  'Servicios y digitales',
] as const;

export type SeedDevCategoryName = (typeof SEED_DEV_CATEGORIES)[number];

export const SEED_DEV_BRANDS = [
  'Casa Norte',
  'VitalPack',
  'TechLine',
  'HogarPlus',
  'DemoBrand',
  'Dulce Horno',
  'Rápido Norte',
] as const;

export const SEED_DEV_ATTRIBUTE_TALLA = {
  name: 'Talla',
  options: ['XS', 'S', 'M', 'L', 'XL'] as const,
  displayOrder: 0,
};

export type SeedDevAttributeDef = {
  name: string;
  options: readonly string[];
  displayOrder: number;
};

/** Atributos de catálogo desarrollo (sincronizados en seed). */
export const SEED_DEV_ATTRIBUTES: readonly SeedDevAttributeDef[] = [
  SEED_DEV_ATTRIBUTE_TALLA,
  {
    name: 'Color',
    options: ['Negro', 'Blanco', 'Azul', 'Gris', 'Rojo'],
    displayOrder: 1,
  },
  {
    name: 'Material',
    options: ['Algodón', 'Poliéster', 'Nylon'],
    displayOrder: 2,
  },
  {
    name: 'Tamaño',
    options: [
      'Individual',
      'Mediano',
      'Familiar',
      'Chica',
      'Mediana',
      'Grande',
      'Simple',
      'Doble',
      'Regular',
      'XL',
    ],
    displayOrder: 3,
  },
  {
    name: 'Sabor',
    options: [
      'Chocolate',
      'Vainilla',
      'Frutilla',
      'Naranja',
      'Clásico',
      'Nueces',
      'Cola',
      'Limón',
    ],
    displayOrder: 4,
  },
  {
    name: 'Tipo',
    options: [
      'Mantequilla',
      'Jamón queso',
      'Masa madre',
      'Integral',
      'Pino',
      'Queso',
      'Clásica',
    ],
    displayOrder: 5,
  },
];

export type SeedDevUnitKey = 'UN' | 'ML' | 'L' | 'G' | 'KG';

export type SeedDevVariantSeed = {
  sku: string;
  barcode?: string;
  /** Omitir para INSUMO. */
  basePrice?: number;
  baseCost: number;
  trackInventory: boolean;
  allowNegativeStock?: boolean;
  retailNet?: number;
  wholesaleNet?: number;
  /** Si false, solo lista minorista. Si true, ambas listas. Omitir en INSUMO. */
  inBothPriceLists?: boolean;
  uom?: { stock: SeedDevUnitKey; sale: SeedDevUnitKey; purchase: SeedDevUnitKey };
  /** Claves = nombre de atributo seed (Talla, Color, Material); valor = opción. */
  attributeValues?: Record<string, string>;
  shipping?: {
    netWeightKg: number;
    grossWeightKg: number;
    packageLengthCm: number;
    packageWidthCm: number;
    packageHeightCm: number;
    volumetricDivisorK?: number;
  };
};

export type SeedDevProductSeed = {
  name: string;
  brand: string;
  description?: string;
  productType: ProductType;
  categoryName: SeedDevCategoryName;
  productBaseUnit?: SeedDevUnitKey;
  /** En seed desarrollo todos los productos quedan visibles en eShop. */
  visibleInEShop?: boolean;
  variants: SeedDevVariantSeed[];
};

/** Catálogo desarrollo: PHYSICAL vendible + INSUMO + ELABORADO + PREPARADO + SERVICE/DIGITAL. */
export const SEED_DEV_PRODUCTS: SeedDevProductSeed[] = [
  {
    name: 'Café molido premium',
    brand: 'Casa Norte',
    description: 'Café en grano molido — presentaciones 250 g, 500 g y 1 kg.',
    productType: ProductType.PHYSICAL,
    categoryName: 'Alimentos y bebidas',
    productBaseUnit: 'UN',
    variants: [
      {
        sku: 'SEEDDEVCAFE250',
        barcode: '7801001002501',
        basePrice: 2790,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2790,
        wholesaleNet: 2350,
        inBothPriceLists: true,
        uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
      },
      {
        sku: 'SEEDDEVCAFE500',
        barcode: '7801001005001',
        basePrice: 4990,
        baseCost: 2200,
        trackInventory: true,
        retailNet: 4990,
        wholesaleNet: 4200,
        inBothPriceLists: true,
        uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
      },
      {
        sku: 'SEEDDEVCAFE1KG',
        barcode: '7801001010001',
        basePrice: 8990,
        baseCost: 4000,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7600,
        inBothPriceLists: false,
        uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
      },
    ],
  },
  {
    name: 'Aceite de oliva extra virgen',
    brand: 'VitalPack',
    description: 'Aceite — insumo de cocina / pastelería (no venta).',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'ML',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVACE500',
        barcode: '7801002005002',
        baseCost: 3200,
        trackInventory: true,
        uom: { stock: 'ML', sale: 'ML', purchase: 'L' },
      },
      {
        sku: 'SEEDDEVACE1L',
        barcode: '7801002010002',
        baseCost: 5200,
        trackInventory: true,
        uom: { stock: 'ML', sale: 'L', purchase: 'L' },
      },
    ],
  },
  {
    name: 'Harina integral',
    brand: 'Casa Norte',
    description: 'Harina — insumo de pastelería (no venta).',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVHAR5',
        barcode: '7801003005001',
        baseCost: 2800,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
      {
        sku: 'SEEDDEVHAR25',
        barcode: '7801003025001',
        baseCost: 12000,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Galletas surtidas',
    brand: 'VitalPack',
    productType: ProductType.PHYSICAL,
    categoryName: 'Alimentos y bebidas',
    variants: [
      {
        sku: 'SEEDDEVGAL400',
        basePrice: 1990,
        baseCost: 900,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1700,
        inBothPriceLists: true,
      },
    ],
  },
  {
    name: 'Té verde caja 20 bolsitas',
    brand: 'Casa Norte',
    productType: ProductType.PHYSICAL,
    categoryName: 'Alimentos y bebidas',
    variants: [
      {
        sku: 'SEEDDEVTE20',
        basePrice: 2490,
        baseCost: 1100,
        trackInventory: true,
        retailNet: 2490,
        wholesaleNet: 2100,
        inBothPriceLists: false,
      },
    ],
  },
  {
    name: 'Polera algodón',
    brand: 'HogarPlus',
    productType: ProductType.PHYSICAL,
    categoryName: 'Textil y vestuario',
    variants: [
      {
        sku: 'SEEDDEVPOLXS',
        basePrice: 11990,
        baseCost: 5500,
        trackInventory: true,
        retailNet: 11990,
        wholesaleNet: 10200,
        inBothPriceLists: true,
        attributeValues: { Talla: 'XS', Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVPOLS',
        basePrice: 12490,
        baseCost: 5800,
        trackInventory: true,
        retailNet: 12490,
        wholesaleNet: 10600,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVPOLM',
        basePrice: 12990,
        baseCost: 6000,
        trackInventory: true,
        retailNet: 12990,
        wholesaleNet: 11000,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Negro', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVPOLL',
        basePrice: 13490,
        baseCost: 6200,
        trackInventory: true,
        retailNet: 13490,
        wholesaleNet: 11400,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Negro', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVPOLXL',
        basePrice: 13990,
        baseCost: 6500,
        trackInventory: true,
        retailNet: 13990,
        wholesaleNet: 11800,
        inBothPriceLists: false,
        attributeValues: { Talla: 'XL', Color: 'Azul', Material: 'Algodón' },
      },
    ],
  },
  {
    name: 'Calcetines deportivos',
    brand: 'HogarPlus',
    description: 'Calcetines técnicos con refuerzo en talón y puntera. Varias tallas y colores.',
    productType: ProductType.PHYSICAL,
    categoryName: 'Textil y vestuario',
    variants: [
      {
        sku: 'SEEDDEVCALSNEG',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Negro' },
      },
      {
        sku: 'SEEDDEVCALSBLA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Blanco' },
      },
      {
        sku: 'SEEDDEVCALSGRA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Gris' },
      },
      {
        sku: 'SEEDDEVCALSAZU',
        basePrice: 3090,
        baseCost: 1250,
        trackInventory: true,
        retailNet: 3090,
        wholesaleNet: 2600,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Azul' },
      },
      {
        sku: 'SEEDDEVCALMNEG',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Negro' },
      },
      {
        sku: 'SEEDDEVCALMBLA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Blanco' },
      },
      {
        sku: 'SEEDDEVCALMGRA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Gris' },
      },
      {
        sku: 'SEEDDEVCALMAZU',
        basePrice: 3090,
        baseCost: 1250,
        trackInventory: true,
        retailNet: 3090,
        wholesaleNet: 2600,
        inBothPriceLists: false,
        attributeValues: { Talla: 'M', Color: 'Azul' },
      },
      {
        sku: 'SEEDDEVCALMROJ',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: false,
        attributeValues: { Talla: 'M', Color: 'Rojo' },
      },
      {
        sku: 'SEEDDEVCALLNEG',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Negro' },
      },
      {
        sku: 'SEEDDEVCALLBLA',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Blanco' },
      },
      {
        sku: 'SEEDDEVCALLGRA',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: false,
        attributeValues: { Talla: 'L', Color: 'Gris' },
      },
      {
        sku: 'SEEDDEVCALLAZU',
        basePrice: 3290,
        baseCost: 1350,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2800,
        inBothPriceLists: false,
        attributeValues: { Talla: 'L', Color: 'Azul' },
      },
      {
        sku: 'SEEDDEVCALXLNEG',
        basePrice: 3290,
        baseCost: 1350,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2800,
        inBothPriceLists: true,
        attributeValues: { Talla: 'XL', Color: 'Negro' },
      },
      {
        sku: 'SEEDDEVCALXLBLA',
        basePrice: 3290,
        baseCost: 1350,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2800,
        inBothPriceLists: false,
        attributeValues: { Talla: 'XL', Color: 'Blanco' },
      },
    ],
  },
  {
    name: 'Detergente líquido 3 L',
    brand: 'VitalPack',
    productType: ProductType.PHYSICAL,
    categoryName: 'Hogar y limpieza',
    variants: [
      {
        sku: 'SEEDDEVDET3L',
        basePrice: 5490,
        baseCost: 2900,
        trackInventory: true,
        retailNet: 5490,
        wholesaleNet: 4700,
        inBothPriceLists: true,
      },
    ],
  },
  {
    name: 'Toalla baño algodón',
    brand: 'HogarPlus',
    productType: ProductType.PHYSICAL,
    categoryName: 'Hogar y limpieza',
    variants: [
      {
        sku: 'SEEDDEVTOABLA',
        basePrice: 8990,
        baseCost: 4500,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7500,
        inBothPriceLists: true,
        attributeValues: { Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVTOAGRS',
        basePrice: 8990,
        baseCost: 4500,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7500,
        inBothPriceLists: false,
        attributeValues: { Color: 'Gris', Material: 'Algodón' },
      },
      {
        sku: 'SEEDDEVTOAAZL',
        basePrice: 9490,
        baseCost: 4700,
        trackInventory: true,
        retailNet: 9490,
        wholesaleNet: 7900,
        inBothPriceLists: false,
        attributeValues: { Color: 'Azul', Material: 'Algodón' },
      },
    ],
  },
  {
    name: 'Mouse inalámbrico',
    brand: 'TechLine',
    productType: ProductType.PHYSICAL,
    categoryName: 'Tecnología y oficina',
    variants: [
      {
        sku: 'SEEDDEVMOUNEG',
        barcode: '7801004001001',
        basePrice: 12990,
        baseCost: 7000,
        trackInventory: true,
        retailNet: 12990,
        wholesaleNet: 11000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Negro' },
      },
      {
        sku: 'SEEDDEVMOUGRS',
        barcode: '7801004001002',
        basePrice: 12990,
        baseCost: 7000,
        trackInventory: true,
        retailNet: 12990,
        wholesaleNet: 11000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Gris' },
      },
      {
        sku: 'SEEDDEVMOUBLA',
        barcode: '7801004001003',
        basePrice: 13490,
        baseCost: 7200,
        trackInventory: true,
        retailNet: 13490,
        wholesaleNet: 11400,
        inBothPriceLists: false,
        attributeValues: { Color: 'Blanco' },
      },
    ],
  },
  {
    name: 'Cable HDMI 2 m',
    brand: 'TechLine',
    productType: ProductType.PHYSICAL,
    categoryName: 'Tecnología y oficina',
    variants: [
      {
        sku: 'SEEDDEVHDMI2',
        basePrice: 5990,
        baseCost: 2500,
        trackInventory: true,
        retailNet: 5990,
        wholesaleNet: 5100,
        inBothPriceLists: false,
      },
    ],
  },
  {
    name: 'Cuaderno universitario 100 hojas',
    brand: 'TechLine',
    productType: ProductType.PHYSICAL,
    categoryName: 'Tecnología y oficina',
    variants: [
      {
        sku: 'SEEDDEVCUAROJ',
        basePrice: 1990,
        baseCost: 800,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1650,
        inBothPriceLists: true,
        attributeValues: { Color: 'Rojo' },
      },
      {
        sku: 'SEEDDEVCUAAZL',
        basePrice: 1990,
        baseCost: 800,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1650,
        inBothPriceLists: true,
        attributeValues: { Color: 'Azul' },
      },
      {
        sku: 'SEEDDEVCUANEG',
        basePrice: 1990,
        baseCost: 800,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1650,
        inBothPriceLists: false,
        attributeValues: { Color: 'Negro' },
      },
    ],
  },
  {
    name: 'Mochila urbana',
    brand: 'TechLine',
    productType: ProductType.PHYSICAL,
    categoryName: 'Tecnología y oficina',
    variants: [
      {
        sku: 'SEEDDEVMOCNEGNYL',
        basePrice: 24990,
        baseCost: 12000,
        trackInventory: true,
        retailNet: 24990,
        wholesaleNet: 21000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Negro', Material: 'Nylon' },
      },
      {
        sku: 'SEEDDEVMOCGRSNYL',
        basePrice: 24990,
        baseCost: 12000,
        trackInventory: true,
        retailNet: 24990,
        wholesaleNet: 21000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Gris', Material: 'Nylon' },
      },
      {
        sku: 'SEEDDEVMOCAZLPOL',
        basePrice: 22990,
        baseCost: 11000,
        trackInventory: true,
        retailNet: 22990,
        wholesaleNet: 19500,
        inBothPriceLists: false,
        attributeValues: { Color: 'Azul', Material: 'Poliéster' },
      },
    ],
  },
  // ——— INSUMO: cocina / pastelería (BOM de recetas; no venta) ———
  {
    name: 'Pan hamburguesa',
    brand: 'Rápido Norte',
    description: 'Pan para hamburguesa — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSPANHAMB',
        barcode: '7804004001001',
        baseCost: 120,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Carne molida',
    brand: 'Casa Norte',
    description: 'Carne molida refrigerada — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSCARNE',
        barcode: '7804004001101',
        baseCost: 5200,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Papa precortada',
    brand: 'Casa Norte',
    description: 'Papa precortada congelada — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSPAPA',
        barcode: '7804004001201',
        baseCost: 1600,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Pan hot dog',
    brand: 'Rápido Norte',
    description: 'Pan para completo — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSPANHOT',
        barcode: '7804004001301',
        baseCost: 100,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Salchicha',
    brand: 'Casa Norte',
    description: 'Salchicha para completo — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSSALCHI',
        barcode: '7804004001401',
        baseCost: 220,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Queso laminado',
    brand: 'Casa Norte',
    description: 'Queso en láminas — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSQUESO',
        barcode: '7804004001501',
        baseCost: 150,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Azúcar granulada',
    brand: 'VitalPack',
    description: 'Azúcar — insumo pastelería.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSAZU',
        barcode: '7804004001601',
        baseCost: 800,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Mantequilla',
    brand: 'VitalPack',
    description: 'Mantequilla — insumo pastelería.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSMANT',
        barcode: '7804004001701',
        baseCost: 6500,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Huevo',
    brand: 'Casa Norte',
    description: 'Huevo unidad — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSHUEVO',
        barcode: '7804004001801',
        baseCost: 90,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Chocolate cobertura',
    brand: 'Dulce Horno',
    description: 'Cobertura de chocolate — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'KG',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSCHOCO',
        barcode: '7804004001901',
        baseCost: 9000,
        trackInventory: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
      },
    ],
  },
  {
    name: 'Limón',
    brand: 'Casa Norte',
    description: 'Limón unidad — insumo.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSLIMON',
        barcode: '7804004002001',
        baseCost: 80,
        trackInventory: true,
      },
    ],
  },
  {
    name: 'Levadura',
    brand: 'VitalPack',
    description: 'Levadura seca — insumo panadería.',
    productType: ProductType.INSUMO,
    categoryName: 'Insumos cocina',
    productBaseUnit: 'G',
    visibleInEShop: false,
    variants: [
      {
        sku: 'SEEDDEVINSLEV',
        barcode: '7804004002101',
        baseCost: 500,
        trackInventory: true,
        uom: { stock: 'G', sale: 'G', purchase: 'G' },
      },
    ],
  },
  // ——— ELABORADO: pastelería (stock vía producción) ———
  {
    name: 'Torta cumpleaños',
    brand: 'Dulce Horno',
    description: 'Torta elaborada en pastelería — sabores y tamaños.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    productBaseUnit: 'UN',
    variants: [
      {
        sku: 'SEEDDEVELABTORCHOIND',
        barcode: '7802002001001',
        basePrice: 8990,
        baseCost: 3200,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7500,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Chocolate', Tamaño: 'Individual' },
      },
      {
        sku: 'SEEDDEVELABTORCHOMED',
        barcode: '7802002001002',
        basePrice: 18990,
        baseCost: 6800,
        trackInventory: true,
        retailNet: 18990,
        wholesaleNet: 16000,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Chocolate', Tamaño: 'Mediano' },
      },
      {
        sku: 'SEEDDEVELABTORCHOFAM',
        barcode: '7802002001003',
        basePrice: 28990,
        baseCost: 10500,
        trackInventory: true,
        retailNet: 28990,
        wholesaleNet: 24500,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Chocolate', Tamaño: 'Familiar' },
      },
      {
        sku: 'SEEDDEVELABTORVAIIND',
        barcode: '7802002001004',
        basePrice: 8490,
        baseCost: 3000,
        trackInventory: true,
        retailNet: 8490,
        wholesaleNet: 7200,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Vainilla', Tamaño: 'Individual' },
      },
      {
        sku: 'SEEDDEVELABTORVAIMED',
        barcode: '7802002001005',
        basePrice: 17990,
        baseCost: 6500,
        trackInventory: true,
        retailNet: 17990,
        wholesaleNet: 15200,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Vainilla', Tamaño: 'Mediano' },
      },
      {
        sku: 'SEEDDEVELABTORVAIFAM',
        barcode: '7802002001006',
        basePrice: 26990,
        baseCost: 9800,
        trackInventory: true,
        retailNet: 26990,
        wholesaleNet: 23000,
        inBothPriceLists: false,
        attributeValues: { Sabor: 'Vainilla', Tamaño: 'Familiar' },
      },
    ],
  },
  {
    name: 'Medialuna',
    brand: 'Dulce Horno',
    description: 'Medialunas de pastelería — mantequilla o jamón queso.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    variants: [
      {
        sku: 'SEEDDEVELABMEDMAN',
        barcode: '7802002001101',
        basePrice: 990,
        baseCost: 280,
        trackInventory: true,
        retailNet: 990,
        wholesaleNet: 750,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Mantequilla' },
      },
      {
        sku: 'SEEDDEVELABMEDJAM',
        barcode: '7802002001102',
        basePrice: 1490,
        baseCost: 420,
        trackInventory: true,
        retailNet: 1490,
        wholesaleNet: 1100,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Jamón queso' },
      },
    ],
  },
  {
    name: 'Pie de limón',
    brand: 'Dulce Horno',
    description: 'Pie de limón fresco — porción o familiar.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    variants: [
      {
        sku: 'SEEDDEVELABPIEIND',
        barcode: '7802002001201',
        basePrice: 2990,
        baseCost: 900,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2400,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Individual' },
      },
      {
        sku: 'SEEDDEVELABPIEFAM',
        barcode: '7802002001202',
        basePrice: 12990,
        baseCost: 4200,
        trackInventory: true,
        retailNet: 12990,
        wholesaleNet: 11000,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Familiar' },
      },
    ],
  },
  {
    name: 'Brownie',
    brand: 'Dulce Horno',
    description: 'Brownie de chocolate — clásico o con nueces.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    variants: [
      {
        sku: 'SEEDDEVELABBROCLA',
        barcode: '7802002001301',
        basePrice: 1890,
        baseCost: 550,
        trackInventory: true,
        retailNet: 1890,
        wholesaleNet: 1500,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Clásico' },
      },
      {
        sku: 'SEEDDEVELABBRONUE',
        barcode: '7802002001302',
        basePrice: 2190,
        baseCost: 680,
        trackInventory: true,
        retailNet: 2190,
        wholesaleNet: 1750,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Nueces' },
      },
    ],
  },
  {
    name: 'Empanada de horno',
    brand: 'Dulce Horno',
    description: 'Empanadas horneadas — pino o queso.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    variants: [
      {
        sku: 'SEEDDEVELABEMPPIN',
        barcode: '7802002001401',
        basePrice: 1590,
        baseCost: 480,
        trackInventory: true,
        retailNet: 1590,
        wholesaleNet: 1250,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Pino' },
      },
      {
        sku: 'SEEDDEVELABEMPQUE',
        barcode: '7802002001402',
        basePrice: 1490,
        baseCost: 450,
        trackInventory: true,
        retailNet: 1490,
        wholesaleNet: 1200,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Queso' },
      },
    ],
  },
  {
    name: 'Pan de masa madre',
    brand: 'Dulce Horno',
    description: 'Pan artesanal — masa madre o integral.',
    productType: ProductType.ELABORADO,
    categoryName: 'Pastelería',
    variants: [
      {
        sku: 'SEEDDEVELABPANMAD',
        barcode: '7802002001501',
        basePrice: 3490,
        baseCost: 1100,
        trackInventory: true,
        retailNet: 3490,
        wholesaleNet: 2800,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Masa madre' },
      },
      {
        sku: 'SEEDDEVELABPANINT',
        barcode: '7802002001502',
        basePrice: 3290,
        baseCost: 1000,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2650,
        inBothPriceLists: false,
        attributeValues: { Tipo: 'Integral' },
      },
    ],
  },
  // ——— PREPARADO: comida rápida (KaiFood / comanda) ———
  {
    name: 'Hamburguesa clásica',
    brand: 'Rápido Norte',
    description: 'Hamburguesa a la plancha — simple o doble.',
    productType: ProductType.PREPARADO,
    categoryName: 'Comida rápida',
    variants: [
      {
        sku: 'SEEDDEVPREPHAMBSI',
        barcode: '7803003001001',
        basePrice: 4990,
        baseCost: 1800,
        trackInventory: true,
        retailNet: 4990,
        wholesaleNet: 4200,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Simple', Tipo: 'Clásica' },
      },
      {
        sku: 'SEEDDEVPREPHAMBDO',
        barcode: '7803003001002',
        basePrice: 6990,
        baseCost: 2600,
        trackInventory: true,
        retailNet: 6990,
        wholesaleNet: 5900,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Doble', Tipo: 'Clásica' },
      },
    ],
  },
  {
    name: 'Papas fritas',
    brand: 'Rápido Norte',
    description: 'Papas fritas — tres tamaños.',
    productType: ProductType.PREPARADO,
    categoryName: 'Comida rápida',
    variants: [
      {
        sku: 'SEEDDEVPREPPAPCHI',
        barcode: '7803003001101',
        basePrice: 1490,
        baseCost: 350,
        trackInventory: true,
        retailNet: 1490,
        wholesaleNet: 1200,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Chica' },
      },
      {
        sku: 'SEEDDEVPREPPAPMED',
        barcode: '7803003001102',
        basePrice: 1990,
        baseCost: 480,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1600,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Mediana' },
      },
      {
        sku: 'SEEDDEVPREPPAPGRA',
        barcode: '7803003001103',
        basePrice: 2490,
        baseCost: 620,
        trackInventory: true,
        retailNet: 2490,
        wholesaleNet: 2000,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Grande' },
      },
    ],
  },
  {
    name: 'Completo italiano',
    brand: 'Rápido Norte',
    description: 'Completo italiano clásico.',
    productType: ProductType.PREPARADO,
    categoryName: 'Comida rápida',
    variants: [
      {
        sku: 'SEEDDEVPREPCOMITA',
        barcode: '7803003001201',
        basePrice: 2790,
        baseCost: 900,
        trackInventory: true,
        retailNet: 2790,
        wholesaleNet: 2300,
        inBothPriceLists: true,
        attributeValues: { Tipo: 'Clásica' },
      },
    ],
  },
  {
    name: 'Bebida gaseosa',
    brand: 'Rápido Norte',
    description: 'Bebida embotellada / vaso — producto físico de compra.',
    productType: ProductType.PHYSICAL,
    categoryName: 'Comida rápida',
    variants: [
      {
        sku: 'SEEDDEVPHYSBEBCOLMED',
        barcode: '7803003001301',
        basePrice: 1290,
        baseCost: 250,
        trackInventory: true,
        retailNet: 1290,
        wholesaleNet: 1000,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Cola', Tamaño: 'Mediana' },
      },
      {
        sku: 'SEEDDEVPHYSBEBCOLGRA',
        barcode: '7803003001302',
        basePrice: 1590,
        baseCost: 320,
        trackInventory: true,
        retailNet: 1590,
        wholesaleNet: 1250,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Cola', Tamaño: 'Grande' },
      },
      {
        sku: 'SEEDDEVPHYSBEBLIMMED',
        barcode: '7803003001303',
        basePrice: 1290,
        baseCost: 250,
        trackInventory: true,
        retailNet: 1290,
        wholesaleNet: 1000,
        inBothPriceLists: true,
        attributeValues: { Sabor: 'Limón', Tamaño: 'Mediana' },
      },
      {
        sku: 'SEEDDEVPHYSBEBNARMED',
        barcode: '7803003001304',
        basePrice: 1290,
        baseCost: 250,
        trackInventory: true,
        retailNet: 1290,
        wholesaleNet: 1000,
        inBothPriceLists: false,
        attributeValues: { Sabor: 'Naranja', Tamaño: 'Mediana' },
      },
    ],
  },
  {
    name: 'Combo del día',
    brand: 'Rápido Norte',
    description: 'Combo hamburguesa + papas + bebida.',
    productType: ProductType.PREPARADO,
    categoryName: 'Comida rápida',
    variants: [
      {
        sku: 'SEEDDEVPREPCOMREG',
        barcode: '7803003001401',
        basePrice: 7990,
        baseCost: 2800,
        trackInventory: true,
        retailNet: 7990,
        wholesaleNet: 6800,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'Regular' },
      },
      {
        sku: 'SEEDDEVPREPCOMXL',
        barcode: '7803003001402',
        basePrice: 9990,
        baseCost: 3600,
        trackInventory: true,
        retailNet: 9990,
        wholesaleNet: 8500,
        inBothPriceLists: true,
        attributeValues: { Tamaño: 'XL' },
      },
    ],
  },
  {
    name: 'Servicio armado de pedido',
    brand: 'DemoBrand',
    productType: ProductType.SERVICE,
    categoryName: 'Servicios y digitales',
    variants: [
      {
        sku: 'SEEDDEVSRVARM',
        basePrice: 3500,
        baseCost: 0,
        trackInventory: false,
        retailNet: 3500,
        wholesaleNet: 3000,
        inBothPriceLists: true,
      },
    ],
  },
  {
    name: 'Pack plantillas hoja de cálculo',
    brand: 'DemoBrand',
    productType: ProductType.DIGITAL,
    categoryName: 'Servicios y digitales',
    variants: [
      {
        sku: 'SEEDDEVDIGXLS',
        basePrice: 15000,
        baseCost: 0,
        trackInventory: false,
        retailNet: 15000,
        wholesaleNet: 12000,
        inBothPriceLists: false,
      },
    ],
  },
];

/** Prefijo de SKU generados por el catálogo de desarrollo. */
export const SEED_DEV_VARIANT_SKU_PREFIX = 'SEEDDEV';

/** Productos visibles y destacados en home eShop (orden = vitrina). */
export const SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES = [
  'Calcetines deportivos',
  'Polera algodón',
  'Toalla baño algodón',
  'Café molido premium',
  'Torta cumpleaños',
  'Medialuna',
] as const;

export function collectSeedDevCatalogSkus(): Set<string> {
  return new Set(SEED_DEV_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku)));
}

export function collectSeedDevCatalogProductNames(): Set<string> {
  return new Set(SEED_DEV_PRODUCTS.map((p) => p.name));
}

/** Variantes PHYSICAL del catálogo seed (sku + baseCost) para planes de compra. */
export function collectSeedDevPhysicalVariants(): Array<{ sku: string; baseCost: number }> {
  const rows: Array<{ sku: string; baseCost: number }> = [];
  for (const product of SEED_DEV_PRODUCTS) {
    if (product.productType !== ProductType.PHYSICAL) continue;
    for (const variant of product.variants) {
      rows.push({
        sku: variant.sku,
        baseCost: Number(variant.baseCost) || 0,
      });
    }
  }
  return rows;
}

/** PHYSICAL con precio de venta (basePrice) — aptos para plan de ventas demo. */
export function collectSeedDevPhysicalSellableVariants(): Array<{
  sku: string;
  basePrice: number;
  baseCost: number;
}> {
  const rows: Array<{ sku: string; basePrice: number; baseCost: number }> = [];
  for (const product of SEED_DEV_PRODUCTS) {
    if (product.productType !== ProductType.PHYSICAL) continue;
    for (const variant of product.variants) {
      const basePrice = Number(variant.basePrice) || 0;
      if (basePrice <= 0) continue;
      rows.push({
        sku: variant.sku,
        basePrice,
        baseCost: Number(variant.baseCost) || 0,
      });
    }
  }
  return rows;
}
