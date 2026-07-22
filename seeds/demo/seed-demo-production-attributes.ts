/**
 * Atributos de producción seed para variantes MANUFACTURADO textiles.
 * IDs UUID hex válidos (solo 0-9a-f) para re-seed idempotente.
 */

export type SeedProductionAttrOptionDef = {
  id: string;
  label: string;
};

export type SeedProductionAttrDef = {
  id: string;
  name: string;
  description?: string;
  tagKey: string;
  tagLabel: string;
  options: SeedProductionAttrOptionDef[];
};

export type SeedVariantProductionAttributesDef = {
  outputSku: string;
  attributes: SeedProductionAttrDef[];
};

export const SEED_DEMO_PRODUCTION_ATTRIBUTES: readonly SeedVariantProductionAttributesDef[] =
  [
    {
      outputSku: 'SEEDDEVMANCAMI',
      attributes: [
        {
          id: 'b1000001-c001-4000-8000-000000000001',
          name: 'Color de hilo',
          description: 'Mismo SKU de hilo industrial; elegir según diseño.',
          tagKey: 'hilos',
          tagLabel: 'Hilos',
          options: [
            {
              id: 'a1000001-c001-4000-8000-000000000001',
              label: 'A tono',
            },
            {
              id: 'a1000001-c001-4000-8000-000000000002',
              label: 'Contraste blanco',
            },
            {
              id: 'a1000001-c001-4000-8000-000000000003',
              label: 'Contraste negro',
            },
          ],
        },
        {
          id: 'b1000001-c001-4000-8000-000000000002',
          name: 'Tipo de etiqueta',
          description: 'Etiqueta marca — mismo código de insumo.',
          tagKey: 'etiquetado',
          tagLabel: 'Etiquetado',
          options: [
            {
              id: 'a1000001-c001-4000-8000-000000000011',
              label: 'Tejida marca',
            },
            {
              id: 'a1000001-c001-4000-8000-000000000012',
              label: 'Satín cuidado',
            },
            {
              id: 'a1000001-c001-4000-8000-000000000013',
              label: 'Ambas',
            },
          ],
        },
        {
          id: 'b1000001-c001-4000-8000-000000000003',
          name: 'Tipo de cuello',
          tagKey: 'acabados',
          tagLabel: 'Acabados',
          options: [
            {
              id: 'a1000001-c001-4000-8000-000000000021',
              label: 'Redondo',
            },
            {
              id: 'a1000001-c001-4000-8000-000000000022',
              label: 'V',
            },
          ],
        },
      ],
    },
    {
      outputSku: 'SEEDDEVMANPANT',
      attributes: [
        {
          id: 'b1000001-d001-4000-8000-000000000001',
          name: 'Tipo de botón',
          description:
            'Mismo costo / SKU Botón; detalle de fabricación para el lote.',
          tagKey: 'herrajes',
          tagLabel: 'Herrajes',
          options: [
            {
              id: 'a1000001-d001-4000-8000-000000000001',
              label: 'Plástico 15 mm',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000002',
              label: 'Nácar',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000003',
              label: 'Metálico',
            },
          ],
        },
        {
          id: 'b1000001-d001-4000-8000-000000000002',
          name: 'Color de hilo',
          tagKey: 'hilos',
          tagLabel: 'Hilos',
          options: [
            {
              id: 'a1000001-d001-4000-8000-000000000011',
              label: 'A tono',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000012',
              label: 'Contraste blanco',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000013',
              label: 'Contraste negro',
            },
          ],
        },
        {
          id: 'b1000001-d001-4000-8000-000000000003',
          name: 'Tipo de cordón',
          tagKey: 'herrajes',
          tagLabel: 'Herrajes',
          options: [
            {
              id: 'a1000001-d001-4000-8000-000000000021',
              label: 'Plano',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000022',
              label: 'Redondo',
            },
            {
              id: 'a1000001-d001-4000-8000-000000000023',
              label: 'Sin cordón',
            },
          ],
        },
      ],
    },
    {
      outputSku: 'SEEDDEVMANPOLE',
      attributes: [
        {
          id: 'b1000001-e001-4000-8000-000000000001',
          name: 'Color de hilo',
          tagKey: 'hilos',
          tagLabel: 'Hilos',
          options: [
            {
              id: 'a1000001-e001-4000-8000-000000000001',
              label: 'A tono',
            },
            {
              id: 'a1000001-e001-4000-8000-000000000002',
              label: 'Contraste blanco',
            },
            {
              id: 'a1000001-e001-4000-8000-000000000003',
              label: 'Contraste negro',
            },
          ],
        },
        {
          id: 'b1000001-e001-4000-8000-000000000002',
          name: 'Capucha',
          tagKey: 'acabados',
          tagLabel: 'Acabados',
          options: [
            {
              id: 'a1000001-e001-4000-8000-000000000011',
              label: 'Con cordón',
            },
            {
              id: 'a1000001-e001-4000-8000-000000000012',
              label: 'Sin cordón',
            },
          ],
        },
        {
          id: 'b1000001-e001-4000-8000-000000000003',
          name: 'Tipo de etiqueta',
          tagKey: 'etiquetado',
          tagLabel: 'Etiquetado',
          options: [
            {
              id: 'a1000001-e001-4000-8000-000000000021',
              label: 'Tejida marca',
            },
            {
              id: 'a1000001-e001-4000-8000-000000000022',
              label: 'Satín cuidado',
            },
            {
              id: 'a1000001-e001-4000-8000-000000000023',
              label: 'Ambas',
            },
          ],
        },
      ],
    },
    {
      outputSku: 'SEEDDEVMANSHOR',
      attributes: [
        {
          id: 'b1000001-f001-4000-8000-000000000001',
          name: 'Color de hilo',
          tagKey: 'hilos',
          tagLabel: 'Hilos',
          options: [
            {
              id: 'a1000001-f001-4000-8000-000000000001',
              label: 'A tono',
            },
            {
              id: 'a1000001-f001-4000-8000-000000000002',
              label: 'Contraste blanco',
            },
            {
              id: 'a1000001-f001-4000-8000-000000000003',
              label: 'Contraste negro',
            },
          ],
        },
        {
          id: 'b1000001-f001-4000-8000-000000000002',
          name: 'Posición etiqueta',
          tagKey: 'etiquetado',
          tagLabel: 'Etiquetado',
          options: [
            {
              id: 'a1000001-f001-4000-8000-000000000011',
              label: 'Lateral',
            },
            {
              id: 'a1000001-f001-4000-8000-000000000012',
              label: 'Pretina',
            },
          ],
        },
      ],
    },
  ];
