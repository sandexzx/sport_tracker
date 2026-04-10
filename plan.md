# Sport Tracker — Implementation Plan

## TL;DR

Build a full-stack strength training tracker (React + Vite, Express + SQLite, PWA, Docker) for personal use on local network. 23 tasks across 8 phases, designed for maximum parallelism. Biggest risks: active workout screen complexity, photo storage, and third-party muscle map integration.

---

## Open Questions

1. **Photo storage sizing** — Should photos be resized on upload (e.g., max 1200px)? Large originals will bloat SQLite/disk quickly. *Recommendation: resize to max 1200px width on server.*
2. **Charting library** — Recharts vs Chart.js for progress charts? *Recommendation: Recharts (React-native, smaller bundle, composable).*
3. **Sound asset** — What audio file for timer notification? *Recommendation: ship a single short beep as base64 embedded, no external file needed.*
4. **Offline behavior** — Should the PWA work fully offline (read+write) or just cache the shell? *Recommendation: offline shell + read-only cache. Writes require server since SQLite is server-side.*
5. **State management** — Active workout state is shared across many components (ActiveWorkout, RestTimer, WorkoutTimer, Dashboard, ProgressionSuggestion). Plain prop drilling won't scale. *Recommendation: Zustand (~1KB, zero boilerplate) for active workout state + React Context for theme/layout.*
6. **Data fetching** — Raw `useState` + `useEffect` for API calls leads to race conditions, stale closures, no cache invalidation. *Recommendation: TanStack Query (React Query) — gives caching, deduplication, optimistic updates, retry, refetch on focus out of the box.*
7. **Backend validation** — 15+ endpoints need input validation. Rolling manual `if (!body.name)` checks is fragile. *Recommendation: zod — works on both client and server, schemas can be shared.*
8. **PWA tooling** — Manual service worker in `public/sw.js` is hard to maintain. *Recommendation: `vite-plugin-pwa` with Workbox — auto-generates SW from config, handles precaching and runtime caching strategies.*

---

## Pre-Mortem Analysis

**Overall Risk Level: MEDIUM**

The project has a well-defined scope (single user, no auth, local network) which eliminates many production concerns. Primary risks are UX complexity in the workout flow and third-party library compatibility.

### Critical Failure Modes

| # | Scenario | Likelihood | Impact | Mitigation |
|---|----------|-----------|--------|------------|
| 1 | **Active workout state loss** — user accidentally closes tab mid-workout, loses all set data | HIGH | HIGH | Auto-save every set change to server immediately (no "submit" button pattern). Workout state is always persisted in DB. Add "resume unfinished workout" on next visit. |
| 2 | **react-muscle-highlighter incompatible** — library doesn't support the muscle groups we need, or has breaking API changes | MEDIUM | MEDIUM | Pin version, wrap in adapter component. Fallback: static SVG body map with CSS-driven highlighting. Research library API before task-018 begins. |
| 3 | **Photo upload corrupts or fills disk** — large images accumulate on personal PC | MEDIUM | MEDIUM | Resize on upload (max 1200px). Store in a dedicated `uploads/` directory mounted as Docker volume. Show disk usage in settings. |
| 4 | **Timer sound doesn't play on mobile** — iOS/Android browsers block audio without user gesture | HIGH | LOW | Use Web Audio API with user-gesture unlock pattern (play silent buffer on first tap). Fallback: vibration API. |
| 5 | **Service worker caches stale app** — PWA serves old version after deploy | MEDIUM | MEDIUM | Use `skipWaiting` + `clients.claim()` strategy. Show "New version available — reload" banner when SW detects update. |
| 6 | **SQLite file lock under concurrent tabs** — two browser tabs writing simultaneously | LOW | HIGH | Use WAL mode in SQLite. Server is single-process so actual concurrency is serialized through Express. Document "one active workout at a time" limitation. |
| 7 | **Schema migration breaks data** — no versioning means ALTER TABLE changes require manual intervention or full reset | MEDIUM | HIGH | Maintain a `schema_version` table. Migration runner checks current version and applies incremental `ALTER TABLE` statements. Never destructive in production — only additive changes. |

### Assumptions

- Single user, no authentication, accessed only from local network
- Node.js 20+ and Docker available on target machine
- Build tools available for `better-sqlite3` native compilation: python3, make, g++ (pre-installed in Node Alpine Docker image, but may need manual install for local dev on some systems)
- `react-muscle-highlighter` npm package is MIT-licensed and compatible with React 18+
- SQLite is sufficient (no need for PostgreSQL)
- Photos stored on filesystem, not in DB blobs
- Russian-only UI (no i18n framework needed, hardcoded strings acceptable)
- Design tokens from `variant-2-soft.jsx` are the final design direction

---

## Implementation Specification

### Architecture

```
┌──────────────────────────────────────────────┐
│                 Docker Compose                │
│  ┌──────────────────────────────────────────┐ │
│  │  Node.js Container (port 3000)           │ │
│  │  ┌─────────────┐  ┌──────────────────┐  │ │
│  │  │ Express API  │  │  Vite Static     │  │ │
│  │  │ /api/*       │  │  Build (dist/)   │  │ │
│  │  └─────┬───────┘  └──────────────────┘  │ │
│  │        │                                  │ │
│  │  ┌─────▼───────┐  ┌──────────────────┐  │ │
│  │  │ better-      │  │  uploads/        │  │ │
│  │  │ sqlite3      │  │  (photos)        │  │ │
│  │  └─────────────┘  └──────────────────┘  │ │
│  └──────────────────────────────────────────┘ │
│       volumes: ./data/ ./uploads/             │
└──────────────────────────────────────────────┘
```

### Directory Structure

```
sport_tracker/
├── client/                    # React + Vite frontend
│   ├── public/
│   │   └── manifest.json
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/               # API client + TanStack Query hooks
│   │   │   ├── client.js      # Base fetch wrapper
│   │   │   ├── queryClient.js # TanStack Query client config
│   │   │   └── hooks/         # useExercises, useWorkouts, etc.
│   │   ├── stores/            # Zustand stores
│   │   │   └── workoutStore.js # Active workout shared state
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Button, Card, Input, Modal, ErrorBoundary, etc.
│   │   │   └── layout/        # Shell, NavBar, Sidebar
│   │   ├── pages/             # Route-level components
│   │   │   ├── Dashboard/
│   │   │   ├── Workout/
│   │   │   ├── History/
│   │   │   ├── Progress/
│   │   │   └── Settings/
│   │   ├── features/          # Feature-specific components
│   │   │   ├── exercises/
│   │   │   ├── templates/
│   │   │   ├── active-workout/
│   │   │   ├── timers/
│   │   │   ├── body/
│   │   │   ├── charts/
│   │   │   └── muscle-map/
│   │   └── styles/
│   │       ├── tokens.css     # Design tokens
│   │       └── global.css
│   └── vite.config.js
├── server/                    # Express + SQLite backend
│   ├── index.js               # Entry point (morgan logging, static serving in prod)
│   ├── db/
│   │   ├── schema.sql
│   │   ├── connection.js
│   │   ├── migrate.js         # Version-based migration runner
│   │   └── seed.js            # Dev seed data (exercises, templates, sample workouts)
│   ├── validation/            # Zod schemas for request validation
│   │   └── schemas.js
│   ├── routes/
│   │   ├── exercises.js
│   │   ├── templates.js
│   │   ├── schedule.js
│   │   ├── workouts.js
│   │   ├── workout-exercises.js
│   │   ├── sets.js
│   │   ├── body.js
│   │   ├── analytics.js
│   │   └── export.js
│   ├── middleware/
│   │   ├── upload.js          # Multer config
│   │   └── validate.js        # Zod validation middleware
│   └── uploads/               # Photo storage
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── package.json               # Root workspace config
└── variant-2-soft.jsx         # Design reference (existing)
```

### Database Schema

```sql
-- Schema versioning
CREATE TABLE schema_version (
  version INTEGER NOT NULL
);
INSERT INTO schema_version VALUES (1);

-- Exercise catalog
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🏋️',
  technique_notes TEXT DEFAULT '',
  rest_timer_seconds INTEGER DEFAULT 90,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Exercise ↔ Muscle group mapping (replaces JSON secondary_muscles field)
-- Enables efficient queries: "all exercises targeting muscle X", muscle load aggregation
CREATE TABLE exercise_muscles (
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_name TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exercise_id, muscle_name)
);

-- Workout templates
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sets_count INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  target_weight REAL DEFAULT 0
);

-- Weekly schedule
CREATE TABLE schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6), -- 0=Mon
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE
);

-- Workouts (instances)
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','abandoned'))
);

CREATE TABLE workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE sets (
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
CREATE TABLE body_checkpoints (
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

CREATE TABLE progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id INTEGER NOT NULL REFERENCES body_checkpoints(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK(photo_type IN ('front','back','side_left','side_right')),
  file_path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Personal records (one current best per exercise per record type, updated via UPSERT)
CREATE TABLE personal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK(record_type IN ('weight','estimated_1rm','volume')),
  value REAL NOT NULL,
  workout_id INTEGER REFERENCES workouts(id),
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exercise_id, record_type)
);
```

### API Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| CRUD   | `/api/exercises` | Exercise catalog |
| CRUD   | `/api/templates` | Workout templates (with nested exercises) |
| CRUD   | `/api/schedule` | Weekly schedule assignments |
| POST   | `/api/workouts` | Start workout (from template or blank) |
| GET    | `/api/workouts` | List workouts (paginated) |
| GET    | `/api/active-workout` | Get current active workout (avoids `:id` route conflict) |
| PATCH  | `/api/workouts/:id` | Update/finish/abandon workout |
| POST   | `/api/workouts/:id/repeat` | Start new workout copying exercises/weights from a past workout |
| CRUD   | `/api/workouts/:id/exercises` | Exercises in active workout |
| CRUD   | `/api/workout-exercises/:weid/sets` | Sets for a workout exercise |
| PATCH  | `/api/sets/:id` | Update individual set |
| PATCH  | `/api/sets/:id/complete` | Mark set done |
| GET    | `/api/workouts/previous/:exerciseId` | Previous performance |
| CRUD   | `/api/body` | Body measurement checkpoints |
| POST   | `/api/body/:id/photos` | Upload progress photos (front/back/side_left/side_right) |
| GET    | `/api/analytics/exercise/:id` | Per-exercise progress data + 1RM |
| GET    | `/api/analytics/records` | Personal records |
| GET    | `/api/analytics/stats` | Streak, monthly count, muscle load |
| GET    | `/api/analytics/body` | Body measurement trends |
| GET    | `/api/analytics/muscle-load` | Weekly muscle group load |
| GET    | `/api/export` | Full JSON data export |

### Component Responsibilities

| Component | Responsibility | Key Interface |
|-----------|---------------|---------------|
| `AppShell` | Responsive layout, nav routing | Renders `<NavBar>` (mobile) or `<Sidebar>` (desktop) + `<Outlet>` |
| `ErrorBoundary` | Catches render errors per-route, shows fallback UI | Wraps each route in `<ErrorBoundary>`, prevents white screen if a feature (e.g. muscle map library) crashes |
| `ExerciseCatalog` | CRUD for exercises | Uses `useExercises()` TanStack Query hook, shows list with search/filter |
| `TemplateEditor` | Build workout templates | Drag-to-reorder exercises, set defaults |
| `ActiveWorkout` | Main workout execution screen | Reads/writes Zustand `workoutStore`, auto-save, timer integration |
| `RestTimer` | Countdown timer overlay | Reads exercise config from `workoutStore`, plays sound on zero |
| `WorkoutTimer` | Elapsed time display | Reads `startedAt` from `workoutStore`, shows in header |
| `HistoryList` | Scrollable workout history | Date grouping, click to view detail |
| `Dashboard` | Home screen | Week strip with nav arrows, today's plan, streak, recent PRs |
| `ProgressCharts` | Recharts-based graphs | Exercise selector, date range, 1RM toggle |
| `BodyTracker` | Measurement entry + photo gallery | Camera/upload for photos, checkpoint form |
| `MuscleHeatMap` | Weekly load visualization | Wraps `react-muscle-highlighter`, computes intensity from workout data |
| `Tooltip` | In-app term explanations | Trigger on tap/hover, positioned popover |

---

## Task DAG

### Parallelism Map

```
Phase 1:  [task-001] ──────────────────────────────────────────────────────
                │
          ┌─────┼──────────────┐
          ▼     ▼              ▼
Phase 2:  [002] [009]         [010]
          │      │              │
    ┌──┬──┼──┬──┐│              │
    ▼  ▼  ▼  ▼  ▼│              │
   003 004 005 006 008          │
    │   │   │   │  │            │
    │   │   │   │  │            │
Phase 3:  (002 + 009 + 010 complete)
          │
    ┌─────┼──────────┬───────────────┐
    ▼     ▼          ▼               ▼
   011   014*       017             021
    │     │          │               │
    ├─────┤          │               │
    ▼     ▼          ▼               │
Phase 4: 012  013  [007]→015,016,018│
          │    │          │   │   │  │
          │    │          ▼   ▼   ▼  │
Phase 5:  │   [013]──→019,020,022   │
          │                         │
Phase 6:  └────────────────→[021]───┘
                                    │
Phase 7:                        [023] ← ALL tasks complete
```
*task-014 depends on task-002 (not task-005) — can start earlier
*task-022 moved to batch 6 (needs working app)
*task-023 is final (Docker build needs complete codebase)

### Dependency Table

| Task | Depends On | Can Parallel With | Notes |
|------|-----------|-------------------|-------|
| task-001 | — | — | Foundation |
| task-002 | 001 | 009, 010 | |
| task-003 | 002 | 004, 005, 006, 008 | |
| task-004 | 002 | 003, 005, 006, 008 | |
| task-005 | 002 | 003, 004, 006, 008 | |
| task-006 | 002 | 003, 004, 005, 008 | |
| task-007 | 005 | — | |
| task-008 | 002 | 003, 004, 005, 006 | |
| task-009 | 001 | 002, 010 | |
| task-010 | 001 | 002, 009 | |
| task-011 | 003, 009, 010 | 014, 017 | |
| task-012 | 004, 011 | 013, 014 | |
| task-013 | 005, 011 | 012, 014 | |
| task-014 | 002, 009, 010 | 011, 012, 013, 017 | *Fixed: only needs workout READ endpoints (task-002), not full active workout API (task-005)* |
| task-015 | 007, 009, 010 | 016, 018 | |
| task-016 | 007, 009, 010 | 015, 018 | |
| task-017 | 006, 009, 010 | 011, 014, 015, 016 | |
| task-018 | 007, 011 | 015, 016, 017 | |
| task-019 | 013 | 020 | |
| task-020 | 013 | 019 | |
| task-021 | 008, 009 | 019, 020 | |
| task-022 | 009, 013 | 019, 020, 021 | *Fixed: moved later — PWA needs working app to cache properly* |
| task-023 | ALL | — | *Fixed: Docker build runs `npm run build`, needs complete codebase* |

---

## Tasks

---

### Phase 1: Project Setup & Foundation

#### task-001 — Project Scaffolding & Design System

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Medium |
| **Dependencies** | None |

**Description:**
Initialize the monorepo with Vite + React frontend and Express + SQLite backend. Set up development tooling, design tokens, and the shared development workflow.

**Deliverables:**
1. `client/` — Vite + React project with `react-router-dom`, `@tanstack/react-query`, `zustand`, `recharts`, `react-muscle-highlighter` as dependencies
2. `server/` — Express project with `better-sqlite3`, `multer`, `cors`, `morgan`, `zod` as dependencies
3. `client/src/styles/tokens.css` — CSS custom properties extracted from `variant-2-soft.jsx`: `--bg: #faf6f1`, `--surface: #ffffff`, `--cream: #f0e9df`, `--terra: #c4704b`, `--terra-light: #e8a888`, `--terra-bg: #fdf0e9`, `--olive: #7a8a6e`, `--olive-bg: #eef2eb`, `--text: #2c2420`, `--text2: #9a8e84`, `--shadow`, font imports (DM Serif Display + DM Sans)
4. `client/src/styles/global.css` — Reset, base typography, utility classes
5. `vite.config.js` — Proxy `/api` to Express dev server (port 3001). Add `vite-plugin-pwa` config (details in task-022).
6. Root `package.json` with scripts: `dev` (concurrently runs client + server), `build`, `start`, `seed` (populate dev data)
7. `.gitignore` for node_modules, dist, data/*.db, uploads/
8. `client/src/api/queryClient.js` — TanStack Query client with default config (staleTime, retry)
9. `client/src/stores/workoutStore.js` — Zustand store stub for active workout state

**Context Files:** `variant-2-soft.jsx` (design reference)

**Verification:**
- `npm run dev` starts both client (port 5173) and server (port 3001)
- Client renders "Sport Tracker" placeholder with correct fonts and colors
- `GET /api/health` returns `{ status: "ok" }`
- Request logging visible in server console (morgan)

**Failure Modes:**
- *Vite proxy misconfiguration* (MEDIUM likelihood, MEDIUM impact) — Mitigation: Test proxy with a `/api/health` endpoint immediately. Use exact proxy config: `server: { proxy: { '/api': 'http://localhost:3001' } }`.
- *`better-sqlite3` fails to compile* (LOW likelihood, HIGH impact) — Mitigation: Ensure build tools (python3, make, g++) are installed. Document in README. In Docker, use `node:20-alpine` with `apk add --no-cache python3 make g++` in build stage.

**Tech Stack:** React 18, Vite 5, Express 4, better-sqlite3, TanStack Query, Zustand, zod, morgan, vite-plugin-pwa, concurrently

---

### Phase 2: Backend API & Database

#### task-002 — Database Schema & Migration System

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Medium |
| **Dependencies** | task-001 |

**Description:**
Create the SQLite database schema with all tables, indexes, and a simple migration runner that auto-applies schema on server start.

**Deliverables:**
1. `server/db/schema.sql` — Full schema (see Implementation Specification above): `schema_version`, `exercises`, `exercise_muscles`, `templates`, `template_exercises`, `schedule`, `workouts`, `workout_exercises`, `sets`, `body_checkpoints`, `progress_photos`, `personal_records`
2. `server/db/connection.js` — Singleton DB connection using `better-sqlite3`, WAL mode enabled, foreign keys ON
3. `server/db/migrate.js` — Version-based migration runner:
   - On startup: checks `schema_version` table. If not exists, runs full `schema.sql` (version 1).
   - If version < current: applies incremental migrations (e.g., `migration_002.sql`, `migration_003.sql`). Only additive changes (ADD COLUMN, CREATE TABLE/INDEX) — never destructive in production.
   - During development: `--reset-db` flag drops and recreates all tables.
4. `server/db/seed.js` — Development seed script (`npm run seed`):
   - 10-15 common exercises (Жим лёжа, Приседания, Становая тяга, etc.) with muscle mappings
   - 2-3 workout templates (Push/Pull/Legs or Upper/Lower)
   - A sample weekly schedule
   - 3-5 completed workouts with realistic set data
   - 1-2 body checkpoints with measurements
   - Auto-computed personal records for seeded data
5. Indexes on: `exercise_muscles.muscle_name`, `sets.workout_exercise_id`, `workout_exercises.workout_id`, `workouts.started_at`, `personal_records.exercise_id`, `schedule.weekday`

**Context Files:** Schema SQL from Implementation Specification section above

**Verification:**
- Server starts and creates `data/sport_tracker.db` automatically
- All tables exist with correct columns (verify with `.schema` dump)
- `schema_version` table exists and shows version 1
- WAL mode is active (`PRAGMA journal_mode` returns `wal`)
- Foreign key constraints enforced (test with invalid FK insert → error)
- `npm run seed` populates database with test data, is idempotent (safe to run multiple times)

**Failure Modes:**
- *Schema changes break existing data during development* (MEDIUM likelihood, LOW impact) — Mitigation: Version-based migrations with only additive changes. `--reset-db` for clean slate during development.
- *Seed data conflicts with existing data* (LOW likelihood, LOW impact) — Mitigation: Seed script checks if data exists before inserting. Uses `INSERT OR IGNORE`.

**Tech Stack:** better-sqlite3, SQLite WAL mode

---

#### task-003 — Exercise Catalog API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Small |
| **Dependencies** | task-002 |

**Description:**
RESTful CRUD endpoints for the exercise catalog. Users create exercises manually (empty by default). Each exercise has name, emoji, muscle groups, technique notes, and rest timer config.

**Deliverables:**
1. `server/routes/exercises.js` — Router with:
   - `GET /api/exercises` — List all, optional `?search=` filter, `?muscle=` filter. Returns exercises with their muscle mappings from `exercise_muscles` table (JOIN).
   - `GET /api/exercises/:id` — Get single exercise with muscles
   - `POST /api/exercises` — Create (body: `{ name, emoji, muscles: [{ name, is_primary }], technique_notes, rest_timer_seconds }`). Inserts into `exercises` + `exercise_muscles` in a transaction.
   - `PUT /api/exercises/:id` — Update. Replaces `exercise_muscles` rows in transaction (DELETE + INSERT).
   - `DELETE /api/exercises/:id` — Delete (fail if used in active workout OR in any template)
2. `server/constants/muscles.js` — Enum of muscle groups in Russian: `Грудь, Спина, Плечи, Бицепс, Трицепс, Предплечья, Пресс, Квадрицепс, Бицепс бедра, Икры, Ягодицы, Трапеция`
3. `server/validation/schemas.js` — Zod schemas: `exerciseSchema` (validates name required, at least one primary muscle from enum, rest_timer_seconds > 0)
4. `server/middleware/validate.js` — Express middleware that validates `req.body` against a zod schema, returns 400 with structured errors on failure
5. Register routes in `server/index.js`

**Verification:**
- CRUD cycle works via curl: create → read → update → delete
- `?muscle=Грудь` filter returns exercises with that muscle (via `exercise_muscles` JOIN)
- Search filter returns matching exercises by name
- Cannot delete exercise used in a workout or template
- Invalid request body returns 400 with specific field errors (zod)

---

#### task-004 — Workout Templates & Schedule API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Small |
| **Dependencies** | task-002 |

**Description:**
CRUD for workout templates (reusable workout plans with ordered exercises and default set configs) and weekly schedule assignments.

**Deliverables:**
1. `server/routes/templates.js`:
   - `GET /api/templates` — List all templates (with exercise count)
   - `GET /api/templates/:id` — Get template with full exercise list and set configs
   - `POST /api/templates` — Create with `{ name, description, exercises: [{ exercise_id, sort_order, sets_count, target_reps, target_weight }] }`
   - `PUT /api/templates/:id` — Update (replace exercise list)
   - `DELETE /api/templates/:id`
2. `server/routes/schedule.js`:
   - `GET /api/schedule` — Get full week schedule (returns array of 7 days with assigned templates)
   - `PUT /api/schedule` — Replace schedule `{ assignments: [{ weekday: 0, template_id: 1 }, ...] }`
   - Multiple templates per weekday supported

**Verification:**
- Create template with 3 exercises → GET returns exercises in correct order
- Assign templates to Mon + Wed → GET schedule shows them correctly
- Multiple templates on same day works
- Delete template removes it from schedule too (CASCADE)

---

#### task-005 — Active Workout & Sets API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Large |
| **Dependencies** | task-002 |

**Description:**
API for managing active workouts: starting from template or blank, managing exercises and sets in real-time, tracking previous performance, and auto-progression suggestions.

**Deliverables:**
1. `server/routes/workouts.js`:
   - `POST /api/workouts` — Start workout. Body: `{ template_id? }`. If template_id provided, pre-populate exercises and sets from template. Returns workout with exercises and empty sets.
   - `GET /api/workouts` — List workouts (paginated, newest first). Query: `?status=completed&limit=20&offset=0`
   - `GET /api/active-workout` — Get current active workout (status='active'), return null if none. **Note:** Separate route to avoid conflict with `GET /api/workouts/:id` (Express would match "active" as `:id`).
   - `GET /api/workouts/:id` — Get workout with all exercises, sets, notes
   - `PATCH /api/workouts/:id` — Update notes, finish workout (`{ status: "completed", finished_at, notes }`), or abandon workout (`{ status: "abandoned" }`). **Note:** Abandoning sets status, does NOT delete data — workout history is preserved for analytics.
   - `POST /api/workouts/:id/repeat` — Start new workout copying exercises and last set weights/reps from a completed workout. Useful for "repeat last Tuesday's workout" flow.
2. `server/routes/workout-exercises.js`:
   - `POST /api/workouts/:id/exercises` — Add exercise to workout `{ exercise_id }`
   - `DELETE /api/workouts/:id/exercises/:exerciseId` — Remove exercise from workout
   - `PATCH /api/workouts/:id/exercises/:exerciseId` — Update order, notes
   - `PUT /api/workouts/:id/exercises/reorder` — Reorder `{ order: [id1, id2, id3] }`
3. `server/routes/sets.js`:
   - `POST /api/workout-exercises/:weid/sets` — Add set `{ weight, reps, rpe, is_warmup }`
   - `PATCH /api/sets/:id` — Update set fields
   - `PATCH /api/sets/:id/complete` — Mark set done (sets `completed=1, completed_at=now`)
   - `DELETE /api/sets/:id` — Remove set
4. `GET /api/workouts/previous/:exerciseId` — Return sets from most recent completed workout containing this exercise (for "previous performance" display). **Note:** Define this route BEFORE `/:id` to avoid conflict.
5. `GET /api/workouts/suggest-progression/:exerciseId` — If all sets in last workout had RPE ≤ 7, return `{ suggest: true, current_weight, suggested_weight }` (increase by 2.5kg or 5%)

**Context Files:** Schema for `workouts`, `workout_exercises`, `sets` tables

**Verification:**
- Start workout from template → exercises and placeholder sets created
- Start blank workout → add exercises on the fly
- Complete sets → mark done with timestamp
- Previous performance returns correct data from last workout
- Auto-progression returns suggestion when all RPE ≤ 7
- Only one active workout at a time (error if trying to start second)
- Finish workout updates status and finished_at
- Abandon workout sets status='abandoned', data preserved
- Repeat workout from history → new workout with copied exercises/weights
- Route order: `/api/active-workout`, `/api/workouts/previous/:exerciseId`, `/api/workouts/:id` — no conflicts

**Failure Modes:**
- *Concurrent writes from multiple tabs* (LOW likelihood, HIGH impact) — Mitigation: SQLite WAL mode + single Express process serializes writes. Add "only one active workout" constraint.
- *Data loss on mid-workout crash* (HIGH likelihood, HIGH impact) — Mitigation: Every set change is immediately persisted (no batch save). `GET /api/active-workout` resumes unfinished workout.
- *Route parameter conflicts* (MEDIUM likelihood, HIGH impact) — Mitigation: Define specific routes (`/active-workout`, `/previous/:exerciseId`, `/suggest-progression/:exerciseId`) before parameterized `/:id` route.

**Tech Stack:** Express router, better-sqlite3 transactions, zod validation

---

#### task-006 — Body Measurements & Photos API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-002 |

**Description:**
API for body measurement checkpoints with progress photo uploads. Photos stored on filesystem, metadata in DB.

**Deliverables:**
1. `server/routes/body.js`:
   - `GET /api/body` — List checkpoints (newest first), include photo metadata
   - `GET /api/body/:id` — Single checkpoint with photos
   - `POST /api/body` — Create checkpoint `{ date, weight, chest, waist, bicep, thighs, neck, calves, notes }`. Date has UNIQUE constraint — returns 409 if checkpoint for that date exists.
   - `PUT /api/body/:id` — Update measurements
   - `DELETE /api/body/:id` — Delete checkpoint + associated photos from disk
2. Photo upload:
   - `POST /api/body/:id/photos` — Upload photo (multipart/form-data). Field: `photo` (file), `photo_type` ('front'|'back'|'side_left'|'side_right'). Resize to max 1200px width using `sharp`. Save to `uploads/photos/{checkpoint_id}_{type}_{timestamp}.jpg`
   - `GET /api/uploads/photos/:filename` — Serve photo file (static middleware)
   - `DELETE /api/body/:id/photos/:photoId` — Delete photo from DB and disk
3. `server/middleware/upload.js` — Multer config for photo uploads (max 10MB, images only)

**Verification:**
- Create checkpoint with all measurements (including neck, calves) → stored correctly
- Duplicate date returns 409 Conflict
- Upload front + back + side photos → files saved to uploads/, metadata in DB
- GET checkpoint returns photo URLs
- Delete checkpoint removes photos from disk
- Rejects non-image files and files > 10MB

**Failure Modes:**
- *Disk space exhaustion from photos* (MEDIUM likelihood, MEDIUM impact) — Mitigation: Resize images on upload with `sharp`. Log upload sizes. Show total storage in settings page.
- *Orphaned files on failed upload* (LOW likelihood, LOW impact) — Mitigation: Write DB record in transaction with file save. On error, clean up file.

**Tech Stack:** multer, sharp (image processing)

---

#### task-007 — Analytics & Stats API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-005 |

**Description:**
Computed analytics endpoints: per-exercise progress, 1RM estimates, personal records, training streaks, monthly stats, and muscle group load data.

**Deliverables:**
1. `server/routes/analytics.js`:
   - `GET /api/analytics/exercise/:id` — Time series: `[{ date, max_weight, total_volume, estimated_1rm }]`. Volume = Σ(weight × reps). 1RM (Epley) = weight × (1 + reps/30). Query: `?period=30d|90d|1y|all`
   - `GET /api/analytics/records` — Personal records per exercise: `[{ exercise_id, exercise_name, best_weight, best_1rm, best_volume, best_weight_date, ... }]`. Auto-updates: on workout completion, compare to existing records and insert if new PR.
   - `GET /api/analytics/stats` — `{ current_streak, longest_streak, workouts_this_month, workouts_this_week, total_workouts, total_volume_this_month }`
   - `GET /api/analytics/body` — Body measurement trends: `[{ date, weight, chest, waist, bicep, thighs }]`
   - `GET /api/analytics/muscle-load` — Weekly muscle group load: `{ muscle_name: total_sets_count }` computed from completed workouts in last 7 days. Uses `exercise_muscles` junction table (JOIN instead of JSON parsing). Primary muscles count as 1 set, secondary as 0.5.
2. PR update logic: When a workout is completed (`PATCH /api/workouts/:id` with status=completed), compute PRs for each exercise and UPSERT into `personal_records` (uses `UNIQUE(exercise_id, record_type)` constraint — `INSERT OR REPLACE`).

**Verification:**
- Exercise progress returns correct weight/volume/1RM over time
- 1RM calculation matches Epley: `weight × (1 + reps/30)`
- Streak counts consecutive days with completed workouts
- Muscle load aggregates correctly (primary=1, secondary=0.5)
- PR auto-detection works on workout completion

---

#### task-008 — JSON Export API

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | LOW |
| **Effort** | Small |
| **Dependencies** | task-002 |

**Description:**
Single endpoint that exports all user data as a JSON file download.

**Deliverables:**
1. `server/routes/export.js`:
   - `GET /api/export` — Returns JSON with all tables: exercises, templates (with exercises), schedule, workouts (with exercises and sets), body_checkpoints (with photo metadata but not photo files), personal_records. Sets `Content-Disposition: attachment; filename=sport_tracker_export_{date}.json`

**Verification:**
- Download produces valid JSON with all data
- File is named with current date
- Contains data from all tables

---

### Phase 3: Frontend Core

#### task-009 — App Shell, Navigation & Responsive Layout

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Medium |
| **Dependencies** | task-001 |

**Description:**
Build the responsive application shell with 5-section navigation (Dashboard, Workout, History, Progress, Settings), bottom tab bar on mobile, sidebar on desktop, and a library of reusable UI components.

**Deliverables:**
1. `client/src/App.jsx` — React Router setup with 5 routes
2. `client/src/components/layout/AppShell.jsx` — Responsive shell: `<Sidebar>` at ≥768px, `<BottomNav>` below. Uses CSS media queries, not JS resize. Renders `<Outlet>` for page content.
3. `client/src/components/layout/BottomNav.jsx` — 5 tabs: Главная (🏠), Тренировка (💪), История (📋), Прогресс (📊), Настройки (⚙️). Active tab highlighted with `--terra`. Safe area padding for notch phones.
4. `client/src/components/layout/Sidebar.jsx` — Desktop sidebar with same 5 links, collapsible
5. Reusable UI components (all using design tokens):
   - `Button.jsx` — Primary (terra), secondary (outline), sizes
   - `Card.jsx` — White surface with shadow (from variant-2-soft.jsx `.ex-card` style)
   - `Input.jsx` — Text, number, textarea variants
   - `NumberStepper.jsx` — Number input with ±increment buttons (used for weight ±2.5kg, reps ±1). Large touch targets (48px min).
   - `Modal.jsx` — Bottom sheet (mobile) / centered dialog (desktop), with backdrop
   - `Badge.jsx` — Status badges (from `.ex-badge` style)
   - `EmptyState.jsx` — Illustration + message for empty lists
   - `PageHeader.jsx` — Page title with optional back button
   - `ErrorBoundary.jsx` — React error boundary wrapping each route. Shows friendly error message with "Попробовать снова" button. Prevents white screen if a feature crashes (e.g. muscle map library).
6. Placeholder pages: `Dashboard.jsx`, `Workout.jsx`, `History.jsx`, `Progress.jsx`, `Settings.jsx` — each showing page title

**Context Files:** `variant-2-soft.jsx` (extract card styles, shadows, animations like `fadeUp`)

**Verification:**
- All 5 routes render correct placeholder pages
- Bottom tab bar shows on mobile viewport (< 768px), sidebar on desktop
- Active tab visually highlighted
- UI components render correctly with design tokens
- Smooth transitions between pages

**Failure Modes:**
- *Bottom nav overlaps content on phones with home bar* (HIGH likelihood, LOW impact) — Mitigation: Use `env(safe-area-inset-bottom)` padding on bottom nav and page content container.

**Tech Stack:** react-router-dom v6, CSS modules or plain CSS

---

#### task-010 — API Client & React Hooks

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Small |
| **Dependencies** | task-001 |

**Description:**
Create a typed API client layer and TanStack Query hooks for all API domains, providing loading/error states, cache invalidation, and optimistic updates. Active workout state managed via Zustand store for cross-component sharing.

**Deliverables:**
1. `client/src/api/client.js` — Base fetch wrapper:
   - `get(url)`, `post(url, body)`, `put(url, body)`, `patch(url, body)`, `del(url)`
   - Auto JSON parse, error handling (throws on non-2xx with error message from body)
   - `uploadFile(url, formData)` for photo uploads
2. `client/src/api/queryClient.js` — TanStack Query client config: `defaultOptions` with `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: true`
3. `client/src/api/hooks/useExercises.js` — TanStack Query: `useQuery(['exercises'], ...)` for list, `useMutation` for create/update/delete with cache invalidation via `queryClient.invalidateQueries(['exercises'])`
4. `client/src/api/hooks/useTemplates.js` — TanStack Query for templates CRUD
5. `client/src/api/hooks/useSchedule.js` — TanStack Query for schedule
6. `client/src/api/hooks/useWorkouts.js` — TanStack Query for workout list + mutations. **Active workout** operations (`addSet`, `updateSet`, `completeSet`) use optimistic updates: update cache immediately, rollback on error.
7. `client/src/api/hooks/useBody.js` — TanStack Query for body checkpoints + photo upload mutation
8. `client/src/api/hooks/useAnalytics.js` — TanStack Query for analytics (longer `staleTime: 5min` since data changes less frequently)
9. `client/src/api/hooks/useExport.js` — `{ exportData }` triggers download
10. `client/src/stores/workoutStore.js` — Zustand store for active workout state shared across components:
    - State: `{ activeWorkout, isTimerRunning, timerSeconds, expandedExerciseId }`
    - Actions: `{ setActiveWorkout, startTimer, stopTimer, setExpandedExercise }`
    - Used by: ActiveWorkout, RestTimer, WorkoutTimer, Dashboard

**Verification:**
- Hooks compile without errors
- `useExercises` fetches from `/api/exercises` and returns `{ data, isLoading, error }`
- Mutations invalidate related queries (e.g. creating exercise refreshes exercise list)
- Optimistic updates: UI updates instantly on set completion, rolls back on server error
- Zustand store accessible from any component without prop drilling
- Window refocus triggers data refresh

**Tech Stack:** TanStack Query v5, Zustand v4

---

### Phase 4: Feature Implementation

#### task-011 — Exercise Catalog UI

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Medium |
| **Dependencies** | task-003, task-009, task-010 |

**Description:**
Full exercise management UI: browsable/searchable list, create/edit form with muscle group selection, emoji picker, technique notes, and rest timer configuration.

**Deliverables:**
1. `client/src/features/exercises/ExerciseList.jsx` — Searchable list of exercises with emoji, name, primary muscle badge. Tap to view/edit. "+" button to create new.
2. `client/src/features/exercises/ExerciseForm.jsx` — Create/edit form:
   - Name (text input, required)
   - Emoji selector (grid of common fitness emojis: 🏋️💪🦵🫳🏃🧘‍♂️🤸‍♂️🏊 etc.)
   - Primary muscle group (single select from muscle enum, Russian labels)
   - Secondary muscle groups (multi-select chips)
   - Technique notes (textarea)
   - Rest timer (number input, seconds, default 90)
3. `client/src/features/exercises/MuscleSelect.jsx` — Reusable muscle group picker component (single or multi mode)
4. Exercise list accessible from Workout page (as sub-section) and when adding exercises to templates/workouts

**Verification:**
- Can create an exercise with all fields filled
- Search filters exercises by name in real-time
- Edit existing exercise, all fields pre-populated
- Delete exercise shows confirmation
- Muscle groups displayed in Russian

---

#### task-012 — Workout Templates & Schedule UI

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-004, task-011 |

**Description:**
UI for creating/editing workout templates and assigning them to weekdays in a visual schedule.

**Deliverables:**
1. `client/src/features/templates/TemplateList.jsx` — List of templates with name, exercise count, description preview. "+" to create.
2. `client/src/features/templates/TemplateEditor.jsx` — Edit template:
   - Name + description inputs
   - Exercise list (from catalog, searchable picker). For each: set count, target reps, target weight. Drag to reorder (or up/down buttons for simplicity).
   - Save / discard buttons
3. `client/src/features/schedule/ScheduleView.jsx` — Weekly view: 7 columns (Пн–Вс), each showing assigned templates. Tap template to view. "+" on a day to assign a template (opens template picker). Long press / swipe to remove assignment. Multiple templates per day supported.
4. Schedule accessible from Dashboard (compact view) and Settings (full management)

**Verification:**
- Create template with 4 exercises → saved and displayed correctly
- Reorder exercises within template
- Assign template to Monday and Thursday → schedule shows correctly
- Remove assignment from schedule
- Multiple templates on same day

---

#### task-013 — Active Workout Screen

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | HIGH |
| **Effort** | Large |
| **Dependencies** | task-005, task-011 |

**Description:**
The core workout execution screen — the most critical and complex feature. Users start a workout (from template or blank), see exercises with expandable sets, enter weight/reps/RPE, mark sets done, see previous performance, and edit the workout on-the-fly.

**Deliverables:**
1. `client/src/features/active-workout/ActiveWorkout.jsx` — Main screen:
   - Start options: "Start from template" (picker), "Free workout" (blank), or "Repeat past workout" (opens history picker → calls `POST /api/workouts/:id/repeat`)
   - If active workout exists, resume it automatically (fetches from `GET /api/active-workout`)
   - Workout duration timer in header (elapsed time since start) — reads from Zustand `workoutStore`
   - Exercise list (expandable cards, styled like variant-2-soft.jsx `.ex-card`)
   - Progress bar showing completed/total sets
   - Workout notes field (expandable)
   - "Finish workout" button (confirms, triggers PR check on server)
   - "Abandon workout" option (hidden in menu, confirms → sets status='abandoned')
2. `client/src/features/active-workout/WorkoutExerciseCard.jsx` — Per-exercise card:
   - Header: emoji + name + done/total badge (from design reference)
   - Expand/collapse to show sets
   - Previous performance line: "Прошлый раз: 20кг×12, 22кг×10, 24кг×8" (fetched from API)
   - "Add set" button, "Remove exercise" option
   - Per-exercise notes (inline textarea)
3. `client/src/features/active-workout/SetRow.jsx` — Per-set row:
   - Weight: `NumberStepper` component (±2.5 кг buttons + direct input, `inputMode="decimal"`)
   - Reps: `NumberStepper` component (±1 buttons + direct input, `inputMode="numeric"`)
   - RPE (select: 6–10 scale, optional)
   - Warmup toggle (small chip/badge)
   - Checkbox to mark done / unmark (toggle, styled like `.set-pill` from design ref)
   - Pre-fill weight/reps from previous workout data (if available from `/api/workouts/previous/:exerciseId`)
   - Tap done → auto-saves to server via optimistic TanStack Query mutation, triggers rest timer via Zustand `workoutStore.startTimer()`
4. `client/src/features/active-workout/ExercisePicker.jsx` — Modal to add exercise to active workout (search + select from catalog)
5. Auto-save: Every field change triggers immediate PATCH to server via TanStack Query optimistic mutation (debounced 300ms for text fields, immediate for checkboxes/number steppers)

**Context Files:** `variant-2-soft.jsx` (exercise card layout, set pill styling, progress bar)

**Verification:**
- Start from template → exercises and placeholder sets appear with pre-filled weights from template
- Start blank → add exercises via picker
- Repeat past workout → exercises and weights pre-filled from selected workout
- Enter weight/reps via NumberStepper (±2.5/±1 buttons) → auto-saved (verify in DB)
- Mark set done → visual feedback + server update. Unmark set → reverts to incomplete.
- Previous performance shows data from last workout of same exercise
- Add/remove exercises mid-workout
- Workout notes saved
- Finish workout → status changes to completed, PR check runs
- Abandon workout → status changes to abandoned, data preserved
- Close tab, reopen → active workout resumes
- Progress bar updates in real-time

**Failure Modes:**
- *State desync between UI and server* (MEDIUM likelihood, HIGH impact) — Mitigation: TanStack Query optimistic updates with automatic rollback on server error. Zustand store keeps UI state in sync across components.
- *Accidental finish/abandon* (HIGH likelihood, MEDIUM impact) — Mitigation: Confirmation dialog "Завершить тренировку?" with summary (sets done, duration). No one-tap finish. Abandon hidden in overflow menu with separate confirmation.
- *Number input UX on mobile* (MEDIUM likelihood, MEDIUM impact) — Mitigation: `NumberStepper` component with ±buttons (large touch targets, 48px min) + direct input with `inputMode="decimal"` / `inputMode="numeric"`.

**Tech Stack:** TanStack Query (optimistic mutations), Zustand (shared workout state), design from variant-2-soft.jsx

---

#### task-014 — Workout History & Detail View

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-002, task-009, task-010 |

**Description:**
History page showing all completed workouts, grouped by date, with tap-to-view full workout details.

**Deliverables:**
1. `client/src/pages/History/History.jsx` — Scrollable list of completed workouts:
   - Grouped by month/date
   - Each card: date, template name (or "Свободная"), exercise count, total volume, duration
   - Pull-to-load-more (pagination)
2. `client/src/features/history/WorkoutDetail.jsx` — Full workout detail view:
   - All exercises with completed sets (weight × reps, RPE if set)
   - Warmup sets visually distinct (dimmed or tagged)
   - Workout notes
   - Duration
   - Total volume
   - "Повторить тренировку" button → calls `POST /api/workouts/:id/repeat`, navigates to active workout
3. Route: `/history/:workoutId`

**Verification:**
- History shows completed workouts in reverse chronological order
- Workout detail shows all exercises and sets correctly
- Volume calculation is correct (Σ weight × reps)
- Pagination works (loads more on scroll)
- "Repeat workout" creates new workout with same exercises and pre-filled weights

---

#### task-015 — Dashboard

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-007, task-009, task-010 |

**Description:**
Home screen with today's scheduled workouts, weekly activity strip, training streak, monthly stats, and recent personal records.

**Deliverables:**
1. `client/src/pages/Dashboard/Dashboard.jsx`:
   - Greeting + date (from design reference: "Четверг, 10 апреля" style)
   - Week strip (from design reference `.week` component): 7 day dots, completed days olive ✓, today highlighted with terra border. **← / → arrows to navigate between weeks** (previous/next). Swipe gesture on mobile for week navigation.
   - If active workout exists: "Продолжить тренировку" banner at top (fetches from `GET /api/active-workout`)
   - Today's scheduled workouts (from schedule). Quick-start button for each template. Or "No workout planned" with "Start free workout" button.
   - Stats cards: current streak (🔥 N дней), workouts this month, total volume this week
   - Recent PRs section: last 5 personal records with exercise name, record type, value, date
2. Style everything using the design tokens and card patterns from variant-2-soft.jsx

**Context Files:** `variant-2-soft.jsx` (week strip, greeting, progress card styles)

**Verification:**
- Dashboard shows correct day of week in Russian
- Week strip reflects actual training days from workout history
- Scheduled workout for today shown with start button
- Streak counter accurate
- PRs section shows recent records

---

### Phase 5: Analytics & Visualization

#### task-016 — Progress Charts

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-007, task-009, task-010 |

**Description:**
Interactive charts showing per-exercise progress over time, 1RM trends, and body measurement graphs.

**Deliverables:**
1. `client/src/pages/Progress/Progress.jsx` — Progress page with tab sections: "Упражнения" / "Замеры тела"
2. `client/src/features/charts/ExerciseChart.jsx`:
   - Exercise selector dropdown (from catalog)
   - Period selector: 30d / 90d / 1y / All
   - Line chart: max weight per session (primary line, terra color)
   - Line chart: estimated 1RM trend (secondary line, olive color)
   - Bar chart: total volume per session (subtle, cream/olive bars)
   - Recharts `<ResponsiveContainer>` for mobile-friendly sizing
3. `client/src/features/charts/BodyChart.jsx`:
   - Multi-line chart for body measurements over time
   - Toggle which measurements to show (checkboxes: weight, chest, waist, bicep, thighs)
   - Different Y-axes for weight (kg) vs circumferences (cm)
4. `client/src/features/charts/PersonalRecords.jsx` — Table/cards of all personal records grouped by exercise: best weight, best 1RM, best volume
5. Charts use Recharts with design tokens (terra, olive colors, cream grid lines)

**Verification:**
- Exercise chart shows data points matching workout history
- 1RM line calculated correctly with Epley formula
- Period selector filters data correctly
- Body chart shows multiple measurement types
- Charts are readable on mobile (responsive)
- Empty state when no data

**Failure Modes:**
- *Chart performance with lots of data* (LOW likelihood, LOW impact) — Mitigation: Limit data points to last 100 sessions per exercise. Use Recharts `isAnimationActive={false}` for large datasets.

**Tech Stack:** Recharts

---

### Phase 6: Body Tracking & Photos

#### task-017 — Body Measurements & Photos UI

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-006, task-009, task-010 |

**Description:**
UI for logging body measurements as checkpoints and attaching progress photos (front + back).

**Deliverables:**
1. `client/src/features/body/CheckpointList.jsx` — Timeline of measurement checkpoints with key values (weight, waist). Tap to view detail.
2. `client/src/features/body/CheckpointForm.jsx` — Create/edit checkpoint:
   - Date picker (default today)
   - Measurement inputs: Вес (кг), Грудь (см), Талия (см), Бицепс (см), Бёдра (см), Шея (см), Икры (см)
   - Notes field
   - Photo upload: "Фото спереди" / "Фото сзади" / "Фото сбоку (лев)" / "Фото сбоку (прав)" buttons → file input or camera capture (`accept="image/*" capture="environment"`)
   - Photo preview thumbnails
3. `client/src/features/body/PhotoGallery.jsx` — Side-by-side photo comparison:
   - Select two checkpoints to compare
   - Shows front/back photos side by side with dates
4. Accessible from Progress page as a tab or sub-section

**Verification:**
- Create checkpoint with all measurements
- Upload front + back photos → preview shows correctly
- Photo comparison between two dates works
- Photos load from server correctly
- Camera capture works on mobile

**Failure Modes:**
- *Photo upload fails silently on slow network* (MEDIUM likelihood, MEDIUM impact) — Mitigation: Show upload progress indicator, retry button on failure, display error message.

---

#### task-018 — Muscle Heat Map & Exercise Muscle Map

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-007, task-011 |

**Description:**
Visual muscle body maps: weekly training load heat map and per-exercise primary/secondary muscle highlighting using `react-muscle-highlighter`.

**Deliverables:**
1. `client/src/features/muscle-map/WeeklyHeatMap.jsx`:
   - Full body front + back view using `react-muscle-highlighter`
   - Color intensity based on weekly set count per muscle group (from `/api/analytics/muscle-load`)
   - Legend: color gradient from cold (0 sets) to hot (20+ sets)
   - Tap muscle group to see which exercises trained it and how many sets
2. `client/src/features/muscle-map/ExerciseMuscleMap.jsx`:
   - Shows body map for a single exercise
   - Primary muscles highlighted bright (terra color)
   - Secondary muscles highlighted dim (terra-light or olive-bg)
   - Used in exercise catalog detail view and during active workout (ℹ️ button)
3. `client/src/features/muscle-map/muscle-mapping.js` — Map our muscle group names to `react-muscle-highlighter` muscle IDs

**Verification:**
- Heat map shows correct intensity for muscles trained in last 7 days
- Untrained muscles show as neutral/gray
- Exercise muscle map highlights correct primary + secondary muscles
- Tapping muscle group shows exercise breakdown
- Component renders without errors

**Failure Modes:**
- *react-muscle-highlighter API mismatch* (MEDIUM likelihood, MEDIUM impact) — Mitigation: Create adapter layer (`muscle-mapping.js`) that maps our muscle names to library IDs. If library is incompatible, fallback to a simple labeled body SVG with CSS classes.
- *Library doesn't render on mobile* (LOW likelihood, MEDIUM impact) — Mitigation: Test early on mobile viewport. The library uses SVG which should scale, but verify.

**Tech Stack:** react-muscle-highlighter

---

### Phase 7: Polish

#### task-019 — Rest Timer & Workout Duration Timer

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Medium |
| **Dependencies** | task-013 |

**Description:**
Configurable rest timer that auto-starts when a set is marked done, plus a workout duration timer. Both with sound notifications.

**Deliverables:**
1. `client/src/features/timers/RestTimer.jsx`:
   - Countdown overlay/banner that appears after marking a set done
   - Duration from exercise's `rest_timer_seconds` config
   - Visual: circular progress or linear bar with remaining seconds
   - Buttons: Pause, Reset, Skip (+30s / -30s adjust)
   - Sound notification at 0: short beep using Web Audio API
   - Dismiss on tap or auto-dismiss after 3 seconds at zero
   - Doesn't block interaction — user can still scroll/edit while timer runs
2. `client/src/features/timers/WorkoutTimer.jsx`:
   - Elapsed time counter in workout header (HH:MM:SS format)
   - Starts when workout begins, pauses when app backgrounds (if possible), shows total on finish
3. `client/src/features/timers/useTimer.js` — Custom hook: `{ seconds, isRunning, start, pause, reset }` using `setInterval` with drift correction
4. `client/src/features/timers/sounds.js` — Web Audio API beep generator. User-gesture unlock pattern: play silent buffer on first user tap to unlock AudioContext on iOS/mobile.

**Verification:**
- Mark set done → rest timer auto-starts with exercise-specific duration
- Timer counts down visually + plays sound at zero
- Timer doesn't block other interactions
- Workout timer shows elapsed time correctly
- Sound plays on mobile (test with user gesture unlock)
- +30s/-30s buttons adjust timer

**Failure Modes:**
- *Audio blocked on mobile without user gesture* (HIGH likelihood, LOW impact) — Mitigation: On first tap anywhere in the app, create and play a silent AudioContext buffer to unlock. Store AudioContext globally. If audio still fails, use Vibration API as fallback: `navigator.vibrate([200, 100, 200])`.
- *Timer drift with setInterval* (MEDIUM likelihood, LOW impact) — Mitigation: Use `Date.now()` delta calculation instead of counting intervals. Check actual elapsed time each tick.

**Tech Stack:** Web Audio API, Vibration API fallback

---

#### task-020 — Tooltips, Technique Reference & Auto-Progression UI

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | LOW |
| **Effort** | Small |
| **Dependencies** | task-013 |

**Description:**
In-app explanatory tooltips for training terms, technique notes viewer during workouts, and auto-progression suggestion display.

**Deliverables:**
1. `client/src/components/ui/Tooltip.jsx` — Tap/hover tooltip component:
   - Small ℹ️ icon trigger
   - Popover with explanation text, positioned above/below intelligently
   - Tap outside or close button to dismiss
   - Content definitions (Russian):
     - RPE: "RPE (Rate of Perceived Exertion) — шкала усилия от 6 до 10. 6 = легко, 10 = максимум."
     - 1RM: "1RM — максимальный вес на одно повторение (расчётный, по формуле Эпли)."
     - Объём: "Общий объём = сумма (вес × повторения) по всем подходам."
2. `client/src/features/active-workout/TechniqueSheet.jsx` — Bottom sheet showing exercise technique notes during workout. Triggered by ℹ️ button on exercise card header. Shows full technique_notes text + exercise muscle map (from task-018 component).
3. `client/src/features/active-workout/ProgressionSuggestion.jsx`:
   - After finishing all sets of an exercise, check `/api/workouts/suggest-progression/:exerciseId`
   - If suggestion available: show subtle banner below exercise: "Все подходы выполнены с RPE ≤ 7. Попробуйте увеличить вес до {suggested_weight} кг 💪"
   - Dismissible, non-intrusive (olive background, small text)

**Verification:**
- Tooltip appears on tap, shows correct explanation, dismisses correctly
- Technique sheet opens with correct notes for the exercise
- Progression suggestion appears when conditions met (all RPE ≤ 7)
- Suggestion shows correct next weight

---

#### task-021 — Settings Page & JSON Export

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | LOW |
| **Effort** | Small |
| **Dependencies** | task-008, task-009 |

**Description:**
Settings page with data management options.

**Deliverables:**
1. `client/src/pages/Settings/Settings.jsx`:
   - "Экспорт данных" — Button to download full JSON export. Shows file size estimate. Triggers download via `/api/export`.
   - "Управление упражнениями" — Link to exercise catalog
   - "Шаблоны тренировок" — Link to templates management
   - "Расписание" — Link to schedule management
   - "О приложении" — Version, brief description
2. Export triggers file download in browser (creates blob URL, auto-clicks link)

**Verification:**
- Export button downloads valid JSON file
- File contains all data
- Links navigate to correct pages
- Page renders with correct design tokens

---

### Phase 8: Docker & Deployment

#### task-022 — PWA Setup

| Field | Value |
|-------|-------|
| **Agent** | gem-implementer |
| **Priority** | MEDIUM |
| **Effort** | Small |
| **Dependencies** | task-009, task-013 |

**Description:**
Make the app installable as a PWA with offline shell caching. Uses `vite-plugin-pwa` with Workbox instead of manual service worker.

**Deliverables:**
1. `vite.config.js` — Add `VitePWA` plugin config:
   - `manifest`: `name: "Sport Tracker"`, `short_name: "Tracker"`, `lang: "ru"`, `theme_color: "#c4704b"`, `background_color: "#faf6f1"`, `display: "standalone"`, `start_url: "/"`
   - Icons: 192px and 512px (generate simple icon with emoji 🏋️ on terra background)
   - `workbox.runtimeCaching`: NetworkFirst for `/api/*`, CacheFirst for fonts/icons/images
   - `registerType: 'prompt'` — shows "New version available" banner
2. `client/src/components/ui/UpdatePrompt.jsx` — "Доступно обновление — обновить" banner when service worker detects new version. Uses `useRegisterSW` hook from `vite-plugin-pwa/react`.
3. Meta tags in `index.html`: `<meta name="theme-color">`, Apple-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)

**Verification:**
- Chrome DevTools → Application → Manifest shows correctly
- "Install" prompt appears (or "Add to Home Screen")
- App opens in standalone mode after install
- Offline: app shell loads (shows cached UI), API calls show appropriate offline message
- Update: deploy new version → banner appears → click → app reloads with new version

**Failure Modes:**
- *Service worker caches old version* (MEDIUM likelihood, MEDIUM impact) — Mitigation: `vite-plugin-pwa` handles cache versioning automatically via Workbox precache manifest. `registerType: 'prompt'` ensures user consents to update.

---

#### task-023 — Docker Compose Configuration

| Field | Value |
|-------|-------|
| **Agent** | gem-devops |
| **Priority** | MEDIUM |
| **Effort** | Small |
| **Dependencies** | All previous tasks (Docker build requires complete app for `npm run build`) |

**Description:**
Containerize the full application with Docker Compose for reliable deployment on home PC.

**Deliverables:**
1. `Dockerfile` — Multi-stage build:
   - Stage 1: `node:20-alpine` — Install deps, build Vite frontend
   - Stage 2: `node:20-alpine` — Copy built frontend + server code, install production deps only
   - Expose port 3000
   - CMD: `node server/index.js`
   - Server serves built frontend static files in production mode
2. `docker-compose.yml`:
   - Service: `sport-tracker`
   - Build from `.`
   - Ports: `3000:3000`
   - Volumes: `./data:/app/data` (SQLite DB), `./uploads:/app/uploads` (photos)
   - `restart: always`
   - Environment: `NODE_ENV=production`
   - `healthcheck`: `curl -f http://localhost:3000/api/health || exit 1` (interval 30s, timeout 5s, retries 3)
3. `.dockerignore` — node_modules, .git, data/, uploads/
4. `server/index.js` — In production, serve `client/dist/` with `express.static`. In dev, only API routes (Vite dev server handles frontend). Morgan logging in both modes.
5. README section on deployment: `docker compose up -d --build`
6. Backup note in README: recommend cron job to copy `./data/sport_tracker.db` periodically, or use `GET /api/export` as a manual backup

**Verification:**
- `docker compose build` succeeds
- `docker compose up -d` starts container
- App accessible at `http://<host-ip>:3000`
- Data persists across container restarts (volume mount)
- Photos persist across restarts
- Container auto-restarts after crash

**Environment:** Docker, Docker Compose v2, Node 20 Alpine

---

## Execution Order Summary

**Critical Path:** task-001 → task-002 → task-005 → task-007 → task-015 (Dashboard)

**Maximum Parallelism Windows:**

| After completing | Can run in parallel |
|------------------|-------------------|
| task-001 | task-002, task-009, task-010 |
| task-002 | task-003, task-004, task-005, task-006, task-008 |
| task-003 + task-009 + task-010 | task-011, task-014, task-017 |
| task-005 | task-007 |
| task-011 | task-012, task-013 |
| task-007 + task-009 + task-010 | task-015, task-016, task-018 |
| task-013 | task-019, task-020, task-022 |
| All tasks complete | task-023 (Docker) |

**Recommended Execution Batches:**
1. task-001
2. task-002 ∥ task-009 ∥ task-010
3. task-003 ∥ task-004 ∥ task-005 ∥ task-006 ∥ task-008
4. task-007 ∥ task-011 ∥ task-014 ∥ task-017
5. task-012 ∥ task-013 ∥ task-015 ∥ task-016
6. task-018 ∥ task-019 ∥ task-020 ∥ task-021 ∥ task-022
7. task-023 (Docker — final)
