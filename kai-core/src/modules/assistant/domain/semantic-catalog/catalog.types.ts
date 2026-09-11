import type { SamiDataset } from '../sami-query.types';

export type SamiMetricDef = {
  id: string;
  label: string;
  column: string;
  aggregate: 'sum' | 'avg' | 'count';
  adminOnly?: boolean;
};

export type SamiDimensionDef = {
  id: string;
  label: string;
  column: string;
};

export type SamiFilterFieldDef = {
  id: string;
  column: string;
  type: 'date' | 'uuid' | 'string' | 'number' | 'boolean';
};

export type SamiDatasetCatalog = {
  dataset: SamiDataset;
  view: string;
  dateField: string | null;
  metrics: SamiMetricDef[];
  dimensions: SamiDimensionDef[];
  filters: SamiFilterFieldDef[];
};
