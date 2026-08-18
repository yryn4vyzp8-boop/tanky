-- TANKY local dev schema (SQLite via node:sqlite).
--
-- Station/pump/fuel-product data is NOT stored here — it is owned by the
-- FuelStationProvider (see @tanky/domain), exactly as it would be in
-- production where that data lives with the forecourt network, not with
-- TANKY. This schema only holds what TANKY itself is the source of truth
-- for: accounts, payment methods, transactions and their audit trail.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  provider_token TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Every fuel transaction gets its own server-generated id and idempotency
-- key. Isolation between concurrent users of the same physical pump comes
-- entirely from this row (and the provider session it owns) — never from
-- pump_id alone, which is reused across transactions over time.
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  station_id TEXT NOT NULL,
  pump_id TEXT NOT NULL,
  pump_label TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_address TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),

  status TEXT NOT NULL,

  max_authorization_amount_rappen INTEGER NOT NULL,
  payment_authorization_id TEXT,

  provider_fuel_session_id TEXT,

  liters REAL,
  price_per_liter_milli_francs INTEGER,
  final_amount_rappen INTEGER,

  payment_capture_id TEXT,
  captured_amount_rappen INTEGER,
  released_amount_rappen INTEGER,

  failure_reason TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_user ON fuel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_status ON fuel_transactions(status);

CREATE TABLE IF NOT EXISTS fuel_transaction_events (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES fuel_transactions(id),
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_events_transaction ON fuel_transaction_events(transaction_id);

-- Forward-looking stubs (per TANKY's B2B/loyalty roadmap). Intentionally
-- minimal in the MVP — enough shape to build on, no business logic wired in.
CREATE TABLE IF NOT EXISTS business_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_users (
  id TEXT PRIMARY KEY,
  business_account_id TEXT NOT NULL REFERENCES business_accounts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  monthly_limit_rappen INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  loyalty_account_id TEXT NOT NULL REFERENCES loyalty_accounts(id),
  fuel_transaction_id TEXT REFERENCES fuel_transactions(id),
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
