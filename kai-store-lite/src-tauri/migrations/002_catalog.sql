CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attributes (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS storages (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'PHYSICAL',
  category_id TEXT REFERENCES categories(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  unit_id TEXT REFERENCES units(id),
  unit_price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS variant_packs (
  parent_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  child_variant_id TEXT NOT NULL REFERENCES product_variants(id),
  quantity REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (parent_variant_id, child_variant_id)
);
