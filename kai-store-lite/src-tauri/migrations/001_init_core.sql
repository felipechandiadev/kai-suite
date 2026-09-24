-- Lite org + users (sqlx schema v1; Option B: fresh DB + seed, not TypeORM clone)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  razon_social TEXT,
  nombre_fantasia TEXT,
  rut TEXT,
  business_activity TEXT,
  address TEXT,
  commune TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS points_of_sale (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT REFERENCES branches(id),
  name TEXT NOT NULL,
  code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  username TEXT NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, username)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
