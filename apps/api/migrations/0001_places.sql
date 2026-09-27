CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  year_built INTEGER,
  quake_label TEXT,
  flood_label TEXT,
  tsunami_label TEXT,
  landslide_label TEXT,
  era TEXT,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
