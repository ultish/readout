ALTER TABLE places ADD COLUMN owner_id TEXT;

DELETE FROM places WHERE owner_id IS NULL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  email TEXT,
  user_id TEXT,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS places_owner ON places (owner_id);
