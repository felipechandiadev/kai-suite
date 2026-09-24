CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  document_number TEXT,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  document_number TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  point_of_sale_id TEXT NOT NULL REFERENCES points_of_sale(id),
  opened_by TEXT REFERENCES users(id),
  closed_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'OPEN',
  opening_amount REAL NOT NULL DEFAULT 0,
  closing_amount REAL,
  counted REAL,
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  cash_session_id TEXT REFERENCES cash_sessions(id),
  customer_id TEXT REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  total REAL NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  voided_at TEXT
);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id TEXT PRIMARY KEY NOT NULL,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount REAL NOT NULL
);
