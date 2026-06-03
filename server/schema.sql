CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  done_floor TEXT NOT NULL,
  done_ceiling TEXT NOT NULL,
  floor_cleared INTEGER DEFAULT 0,
  ceiling_cleared INTEGER DEFAULT 0,
  hours_logged REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS barriers (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  barrier_text TEXT NOT NULL,
  barrier_type TEXT NOT NULL,
  mitigation TEXT,
  resolved INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subskills (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL,
  week_phase TEXT NOT NULL,
  cleared INTEGER DEFAULT 0,
  cleared_at TEXT
);

CREATE TABLE IF NOT EXISTS plan_sessions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  subskill_id TEXT NOT NULL REFERENCES subskills(id),
  session_number INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  week_phase TEXT NOT NULL,
  scheduled_date TEXT,
  budget_minutes INTEGER NOT NULL DEFAULT 45,
  status TEXT DEFAULT 'planned'
);

CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  plan_session_id TEXT REFERENCES plan_sessions(id),
  session_number INTEGER NOT NULL,
  subskill TEXT NOT NULL,
  subskill_target TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  minutes_logged REAL,
  practice_output TEXT,
  self_correct_output TEXT,
  ready_to_advance INTEGER DEFAULT 0,
  plan_advanced INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audio_cache (
  id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE,
  text_content TEXT NOT NULL,
  language_code TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  session_log_id TEXT REFERENCES session_logs(id),
  assessed_at TEXT NOT NULL,
  floor_result TEXT,
  ceiling_result TEXT,
  floor_passed INTEGER,
  ceiling_passed INTEGER,
  notes TEXT
);
