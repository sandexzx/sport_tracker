-- Sport Tracker — full schema (version 1)

-- Schema versioning
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

-- Exercise catalog
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🏋️',
  technique_notes TEXT DEFAULT '',
  rest_timer_seconds INTEGER DEFAULT 90,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Exercise-Muscle mapping
CREATE TABLE IF NOT EXISTS exercise_muscles (
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_name TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exercise_id, muscle_name)
);

-- Workout templates
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sets_count INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  target_weight REAL DEFAULT 0
);

-- Weekly schedule
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE
);

-- Workouts (instances)
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','abandoned'))
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe REAL,
  is_warmup INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  completed_at TEXT
);

-- Body tracking
CREATE TABLE IF NOT EXISTS body_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE DEFAULT (date('now')),
  weight REAL,
  chest REAL,
  waist REAL,
  bicep REAL,
  thighs REAL,
  neck REAL,
  calves REAL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id INTEGER NOT NULL REFERENCES body_checkpoints(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK(photo_type IN ('front','back','side_left','side_right')),
  file_path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK(record_type IN ('weight','estimated_1rm','volume')),
  value REAL NOT NULL,
  workout_id INTEGER REFERENCES workouts(id),
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exercise_id, record_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON exercise_muscles(muscle_name);
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_schedule_weekday ON schedule(weekday);
