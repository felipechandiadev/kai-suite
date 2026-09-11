export type SamiDataset =
  | 'sales'
  | 'inventory'
  | 'purchasing'
  | 'dining'
  | 'catalog';

export type SamiFilterOp =
  | 'eq'
  | 'neq'
  | 'in'
  | 'between'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'is_null'
  | 'not_null';

export type SamiFilter = {
  field: string;
  op: SamiFilterOp;
  value?: string | number | boolean | null | string[] | [string, string];
};

export type SamiQuery = {
  version: 1;
  source: 'semantic';
  dataset: SamiDataset;
  metrics: string[];
  dimensions?: string[];
  filters?: SamiFilter[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  chart?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'none';
    x?: string;
    y?: string;
    title?: string;
  };
};

export class SamiQueryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SamiQueryError';
  }
}
