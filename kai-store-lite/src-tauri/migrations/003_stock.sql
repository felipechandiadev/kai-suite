CREATE TABLE IF NOT EXISTS stock_levels (
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  storage_id TEXT NOT NULL REFERENCES storages(id),
  quantity REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (variant_id, storage_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  variant_id TEXT NOT NULL,
  storage_id TEXT NOT NULL,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
