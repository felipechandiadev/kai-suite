CREATE TABLE IF NOT EXISTS receptions (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  supplier_id TEXT REFERENCES suppliers(id),
  storage_id TEXT NOT NULL REFERENCES storages(id),
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  note TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reception_lines (
  id TEXT PRIMARY KEY NOT NULL,
  reception_id TEXT NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0
);
