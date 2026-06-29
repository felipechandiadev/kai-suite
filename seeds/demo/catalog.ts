import { ProductType } from '@modules/products/domain/product.entity';

/** Categorías multi-rubro (sin vidrios / parabrisas). */
export const SEED_DEV_CATEGORIES = [
  'Alimentos y bebidas',
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
];

export type SeedDevUnitKey = 'UN' | 'ML' | 'L' | 'G' | 'KG';

export type SeedDevVariantSeed = {
  sku: string;
  barcode?: string;
  basePrice: number;
  baseCost: number;
  trackInventory: boolean;
  allowNegativeStock?: boolean;
  retailNet: number;
  wholesaleNet: number;
  /** Si false, solo lista minorista. Si true, ambas listas. */
  inBothPriceLists: boolean;
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

/** ~47 variantes; mayoría PHYSICAL; varias con Talla/Color/Material; reparto 50/50 en listas. */
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
        sku: 'SEED-DEV-CAFE-250',
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
        sku: 'SEED-DEV-CAFE-500',
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
        sku: 'SEED-DEV-CAFE-1KG',
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
    productType: ProductType.PHYSICAL,
    categoryName: 'Alimentos y bebidas',
    productBaseUnit: 'ML',
    variants: [
      {
        sku: 'SEED-DEV-ACE-500',
        barcode: '7801002005002',
        basePrice: 5990,
        baseCost: 3200,
        trackInventory: true,
        retailNet: 5990,
        wholesaleNet: 5100,
        inBothPriceLists: true,
        uom: { stock: 'ML', sale: 'ML', purchase: 'L' },
      },
      {
        sku: 'SEED-DEV-ACE-1L',
        barcode: '7801002010002',
        basePrice: 9990,
        baseCost: 5200,
        trackInventory: true,
        retailNet: 9990,
        wholesaleNet: 8500,
        inBothPriceLists: false,
        uom: { stock: 'ML', sale: 'L', purchase: 'L' },
      },
    ],
  },
  {
    name: 'Harina integral',
    brand: 'Casa Norte',
    productType: ProductType.PHYSICAL,
    categoryName: 'Alimentos y bebidas',
    productBaseUnit: 'KG',
    variants: [
      {
        sku: 'SEED-DEV-HAR-5',
        barcode: '7801003005001',
        basePrice: 4590,
        baseCost: 2800,
        trackInventory: true,
        retailNet: 4590,
        wholesaleNet: 3990,
        inBothPriceLists: true,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
        shipping: {
          netWeightKg: 5,
          grossWeightKg: 5.1,
          packageLengthCm: 38,
          packageWidthCm: 26,
          packageHeightCm: 14,
        },
      },
      {
        sku: 'SEED-DEV-HAR-25',
        barcode: '7801003025001',
        basePrice: 18990,
        baseCost: 12000,
        trackInventory: true,
        retailNet: 18990,
        wholesaleNet: 16500,
        inBothPriceLists: false,
        uom: { stock: 'KG', sale: 'KG', purchase: 'KG' },
        shipping: {
          netWeightKg: 25,
          grossWeightKg: 25.5,
          packageLengthCm: 65,
          packageWidthCm: 42,
          packageHeightCm: 18,
        },
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
        sku: 'SEED-DEV-GAL-400',
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
        sku: 'SEED-DEV-TE-20',
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
        sku: 'SEED-DEV-POL-XS',
        basePrice: 11990,
        baseCost: 5500,
        trackInventory: true,
        retailNet: 11990,
        wholesaleNet: 10200,
        inBothPriceLists: true,
        attributeValues: { Talla: 'XS', Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-POL-S',
        basePrice: 12490,
        baseCost: 5800,
        trackInventory: true,
        retailNet: 12490,
        wholesaleNet: 10600,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-POL-M',
        basePrice: 12990,
        baseCost: 6000,
        trackInventory: true,
        retailNet: 12990,
        wholesaleNet: 11000,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Negro', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-POL-L',
        basePrice: 13490,
        baseCost: 6200,
        trackInventory: true,
        retailNet: 13490,
        wholesaleNet: 11400,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Negro', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-POL-XL',
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
        sku: 'SEED-DEV-CAL-S-NEG',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Negro' },
      },
      {
        sku: 'SEED-DEV-CAL-S-BLA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Blanco' },
      },
      {
        sku: 'SEED-DEV-CAL-S-GRA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Gris' },
      },
      {
        sku: 'SEED-DEV-CAL-S-AZU',
        basePrice: 3090,
        baseCost: 1250,
        trackInventory: true,
        retailNet: 3090,
        wholesaleNet: 2600,
        inBothPriceLists: true,
        attributeValues: { Talla: 'S', Color: 'Azul' },
      },
      {
        sku: 'SEED-DEV-CAL-M-NEG',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Negro' },
      },
      {
        sku: 'SEED-DEV-CAL-M-BLA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Blanco' },
      },
      {
        sku: 'SEED-DEV-CAL-M-GRA',
        basePrice: 2990,
        baseCost: 1200,
        trackInventory: true,
        retailNet: 2990,
        wholesaleNet: 2500,
        inBothPriceLists: true,
        attributeValues: { Talla: 'M', Color: 'Gris' },
      },
      {
        sku: 'SEED-DEV-CAL-M-AZU',
        basePrice: 3090,
        baseCost: 1250,
        trackInventory: true,
        retailNet: 3090,
        wholesaleNet: 2600,
        inBothPriceLists: false,
        attributeValues: { Talla: 'M', Color: 'Azul' },
      },
      {
        sku: 'SEED-DEV-CAL-M-ROJ',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: false,
        attributeValues: { Talla: 'M', Color: 'Rojo' },
      },
      {
        sku: 'SEED-DEV-CAL-L-NEG',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Negro' },
      },
      {
        sku: 'SEED-DEV-CAL-L-BLA',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: true,
        attributeValues: { Talla: 'L', Color: 'Blanco' },
      },
      {
        sku: 'SEED-DEV-CAL-L-GRA',
        basePrice: 3190,
        baseCost: 1300,
        trackInventory: true,
        retailNet: 3190,
        wholesaleNet: 2700,
        inBothPriceLists: false,
        attributeValues: { Talla: 'L', Color: 'Gris' },
      },
      {
        sku: 'SEED-DEV-CAL-L-AZU',
        basePrice: 3290,
        baseCost: 1350,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2800,
        inBothPriceLists: false,
        attributeValues: { Talla: 'L', Color: 'Azul' },
      },
      {
        sku: 'SEED-DEV-CAL-XL-NEG',
        basePrice: 3290,
        baseCost: 1350,
        trackInventory: true,
        retailNet: 3290,
        wholesaleNet: 2800,
        inBothPriceLists: true,
        attributeValues: { Talla: 'XL', Color: 'Negro' },
      },
      {
        sku: 'SEED-DEV-CAL-XL-BLA',
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
        sku: 'SEED-DEV-DET-3L',
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
        sku: 'SEED-DEV-TOA-BLA',
        basePrice: 8990,
        baseCost: 4500,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7500,
        inBothPriceLists: true,
        attributeValues: { Color: 'Blanco', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-TOA-GRS',
        basePrice: 8990,
        baseCost: 4500,
        trackInventory: true,
        retailNet: 8990,
        wholesaleNet: 7500,
        inBothPriceLists: false,
        attributeValues: { Color: 'Gris', Material: 'Algodón' },
      },
      {
        sku: 'SEED-DEV-TOA-AZL',
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
        sku: 'SEED-DEV-MOU-NEG',
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
        sku: 'SEED-DEV-MOU-GRS',
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
        sku: 'SEED-DEV-MOU-BLA',
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
        sku: 'SEED-DEV-HDMI-2',
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
        sku: 'SEED-DEV-CUA-ROJ',
        basePrice: 1990,
        baseCost: 800,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1650,
        inBothPriceLists: true,
        attributeValues: { Color: 'Rojo' },
      },
      {
        sku: 'SEED-DEV-CUA-AZL',
        basePrice: 1990,
        baseCost: 800,
        trackInventory: true,
        retailNet: 1990,
        wholesaleNet: 1650,
        inBothPriceLists: true,
        attributeValues: { Color: 'Azul' },
      },
      {
        sku: 'SEED-DEV-CUA-NEG',
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
        sku: 'SEED-DEV-MOC-NEG-NYL',
        basePrice: 24990,
        baseCost: 12000,
        trackInventory: true,
        retailNet: 24990,
        wholesaleNet: 21000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Negro', Material: 'Nylon' },
      },
      {
        sku: 'SEED-DEV-MOC-GRS-NYL',
        basePrice: 24990,
        baseCost: 12000,
        trackInventory: true,
        retailNet: 24990,
        wholesaleNet: 21000,
        inBothPriceLists: true,
        attributeValues: { Color: 'Gris', Material: 'Nylon' },
      },
      {
        sku: 'SEED-DEV-MOC-AZL-POL',
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
  {
    name: 'Servicio armado de pedido',
    brand: 'DemoBrand',
    productType: ProductType.SERVICE,
    categoryName: 'Servicios y digitales',
    variants: [
      {
        sku: 'SEED-DEV-SRV-ARM',
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
        sku: 'SEED-DEV-DIG-XLS',
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
export const SEED_DEV_VARIANT_SKU_PREFIX = 'SEED-DEV-';

/** Productos visibles y destacados en home eShop (orden = vitrina). */
export const SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES = [
  'Calcetines deportivos',
  'Polera algodón',
  'Toalla baño algodón',
  'Café molido premium',
] as const;

export function collectSeedDevCatalogSkus(): Set<string> {
  return new Set(SEED_DEV_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku)));
}

export function collectSeedDevCatalogProductNames(): Set<string> {
  return new Set(SEED_DEV_PRODUCTS.map((p) => p.name));
}
