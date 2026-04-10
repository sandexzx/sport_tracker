import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERIOD_MAP = {
  '30d': '-30 days',
  '90d': '-90 days',
  '1y': '-1 year',
};

function parsePeriod(raw) {
  if (!raw || raw === 'all') return null;
  return PERIOD_MAP[raw] ?? PERIOD_MAP['90d'];
}

// ─── GET /exercise/:id ─────────────────────────────────────────────────────

router.get('/exercise/:id', (req, res) => {
  const exerciseId = Number(req.params.id);

  const exercise = db.prepare('SELECT id FROM exercises WHERE id = ?').get(exerciseId);
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

  const offset = parsePeriod(req.query.period);

  let sql = `
    SELECT
      w.started_at AS date,
      MAX(s.weight) AS max_weight,
      SUM(s.weight * s.reps) AS total_volume,
      MAX(s.weight * (1.0 + s.reps / 30.0)) AS estimated_1rm,
      COUNT(s.id) AS total_sets,
      SUM(s.reps) AS total_reps
    FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    JOIN sets s ON s.workout_exercise_id = we.id
    WHERE w.status = 'completed'
      AND s.completed = 1
      AND we.exercise_id = ?
  `;
  const params = [exerciseId];

  if (offset) {
    sql += ` AND w.started_at >= date('now', ?)`;
    params.push(offset);
  }

  sql += ` GROUP BY w.id ORDER BY w.started_at ASC`;

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// ─── GET /records ───────────────────────────────────────────────────────────

router.get('/records', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      pr.exercise_id,
      e.name AS exercise_name,
      e.emoji AS exercise_emoji,
      pr.record_type,
      pr.value,
      pr.achieved_at,
      pr.workout_id
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    ORDER BY pr.exercise_id, pr.record_type
  `).all();

  // Group by exercise
  const grouped = [];
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.exercise_id)) {
      const group = {
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        exercise_emoji: row.exercise_emoji,
        records: [],
      };
      map.set(row.exercise_id, group);
      grouped.push(group);
    }
    map.get(row.exercise_id).records.push({
      record_type: row.record_type,
      value: row.value,
      achieved_at: row.achieved_at,
      workout_id: row.workout_id,
    });
  }

  res.json(grouped);
});

// ─── GET /stats ─────────────────────────────────────────────────────────────

router.get('/stats', (_req, res) => {
  // Unique workout dates sorted descending
  const dates = db.prepare(`
    SELECT DISTINCT date(started_at) AS d
    FROM workouts
    WHERE status = 'completed'
    ORDER BY d DESC
  `).all().map(r => r.d);

  // Current streak: consecutive days ending today or yesterday
  let currentStreak = 0;
  if (dates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Start counting if most recent workout is today or yesterday
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      let cursor = new Date(dates[0]);
      const dateSet = new Set(dates);
      while (dateSet.has(cursor.toISOString().slice(0, 10))) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
  }

  // Longest streak
  let longestStreak = 0;
  if (dates.length > 0) {
    const sortedAsc = [...dates].sort();
    let streak = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prev = new Date(sortedAsc[i - 1]);
      const curr = new Date(sortedAsc[i]);
      const diffMs = curr.getTime() - prev.getTime();
      if (diffMs === 86400000) {
        streak++;
      } else {
        if (streak > longestStreak) longestStreak = streak;
        streak = 1;
      }
    }
    if (streak > longestStreak) longestStreak = streak;
  }

  // Workouts this week (ISO week: Mon-Sun)
  const workoutsThisWeek = db.prepare(`
    SELECT COUNT(*) AS c FROM workouts
    WHERE status = 'completed'
      AND date(started_at, 'weekday 0', '-6 days') = date('now', 'weekday 0', '-6 days')
  `).get().c;

  // Workouts this month
  const workoutsThisMonth = db.prepare(`
    SELECT COUNT(*) AS c FROM workouts
    WHERE status = 'completed'
      AND strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now')
  `).get().c;

  // Total workouts
  const totalWorkouts = db.prepare(`
    SELECT COUNT(*) AS c FROM workouts WHERE status = 'completed'
  `).get().c;

  // Total volume this month
  const totalVolumeThisMonth = db.prepare(`
    SELECT COALESCE(SUM(s.weight * s.reps), 0) AS v
    FROM sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.status = 'completed'
      AND s.completed = 1
      AND strftime('%Y-%m', w.started_at) = strftime('%Y-%m', 'now')
  `).get().v;

  res.json({
    current_streak: currentStreak,
    longest_streak: longestStreak,
    workouts_this_week: workoutsThisWeek,
    workouts_this_month: workoutsThisMonth,
    total_workouts: totalWorkouts,
    total_volume_this_month: totalVolumeThisMonth,
  });
});

// ─── GET /body ──────────────────────────────────────────────────────────────

router.get('/body', (_req, res) => {
  const rows = db.prepare(`
    SELECT date, weight, chest, waist, bicep, thighs, neck, calves
    FROM body_checkpoints
    ORDER BY date ASC
  `).all();
  res.json(rows);
});

// ─── GET /muscle-load ───────────────────────────────────────────────────────

router.get('/muscle-load', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      em.muscle_name,
      SUM(CASE WHEN em.is_primary = 1 THEN 1.0 ELSE 0.5 END) AS total_sets
    FROM sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    JOIN exercise_muscles em ON em.exercise_id = we.exercise_id
    WHERE w.status = 'completed'
      AND s.completed = 1
      AND w.started_at >= date('now', '-7 days')
    GROUP BY em.muscle_name
    ORDER BY total_sets DESC
  `).all();

  const result = {};
  for (const r of rows) {
    result[r.muscle_name] = r.total_sets;
  }
  res.json(result);
});

export default router;
