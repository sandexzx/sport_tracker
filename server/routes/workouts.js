import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFullWorkout(workoutId) {
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
  if (!workout) return null;

  const exercises = db.prepare(`
    SELECT we.id, we.exercise_id, we.sort_order, we.notes,
           e.name, e.emoji
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ?
    ORDER BY we.sort_order
  `).all(workoutId);

  for (const ex of exercises) {
    ex.sets = db.prepare(`
      SELECT id, set_number, weight, reps, rpe, is_warmup, completed, completed_at
      FROM sets WHERE workout_exercise_id = ?
      ORDER BY set_number
    `).all(ex.id);
  }

  return { ...workout, exercises };
}

function computePersonalRecords(workoutId) {
  const rows = db.prepare(`
    SELECT we.exercise_id, s.weight, s.reps
    FROM workout_exercises we
    JOIN sets s ON s.workout_exercise_id = we.id
    WHERE we.workout_id = ? AND s.completed = 1
  `).all(workoutId);

  const byExercise = new Map();
  for (const r of rows) {
    if (!byExercise.has(r.exercise_id)) byExercise.set(r.exercise_id, []);
    byExercise.get(r.exercise_id).push(r);
  }

  const upsert = db.prepare(`
    INSERT INTO personal_records (exercise_id, record_type, value, workout_id, achieved_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(exercise_id, record_type) DO UPDATE SET
      value = excluded.value,
      workout_id = excluded.workout_id,
      achieved_at = excluded.achieved_at
    WHERE excluded.value > personal_records.value
  `);

  const run = db.transaction(() => {
    for (const [exerciseId, sets] of byExercise) {
      let bestWeight = 0;
      let best1rm = 0;
      let volume = 0;

      for (const s of sets) {
        if (s.weight > bestWeight) bestWeight = s.weight;
        const e1rm = s.weight * (1 + s.reps / 30);
        if (e1rm > best1rm) best1rm = e1rm;
        volume += s.weight * s.reps;
      }

      if (bestWeight > 0) upsert.run(exerciseId, 'weight', bestWeight, workoutId);
      if (best1rm > 0) upsert.run(exerciseId, 'estimated_1rm', Math.round(best1rm * 10) / 10, workoutId);
      if (volume > 0) upsert.run(exerciseId, 'volume', volume, workoutId);
    }
  });

  run();
}

// ── Specific routes FIRST (before :id) ──────────────────────────────────────

// GET /api/active-workout
router.get('/active-workout', (_req, res) => {
  const workout = db.prepare("SELECT id FROM workouts WHERE status = 'active' LIMIT 1").get();
  if (!workout) return res.status(204).end();
  res.json(getFullWorkout(workout.id));
});

// GET /api/workouts/previous/:exerciseId
router.get('/workouts/previous/:exerciseId', (req, res) => {
  const exerciseId = Number(req.params.exerciseId);

  const row = db.prepare(`
    SELECT w.id AS workout_id, w.started_at AS date
    FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    WHERE w.status = 'completed' AND we.exercise_id = ?
    ORDER BY w.started_at DESC
    LIMIT 1
  `).get(exerciseId);

  if (!row) return res.json({ workout_id: null, date: null, sets: [] });

  const sets = db.prepare(`
    SELECT s.weight, s.reps, s.rpe
    FROM sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    WHERE we.workout_id = ? AND we.exercise_id = ?
    ORDER BY s.set_number
  `).all(row.workout_id, exerciseId);

  res.json({ workout_id: row.workout_id, date: row.date, sets });
});

// GET /api/workouts/suggest-progression/:exerciseId
router.get('/workouts/suggest-progression/:exerciseId', (req, res) => {
  const exerciseId = Number(req.params.exerciseId);

  const lastWorkout = db.prepare(`
    SELECT w.id
    FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    WHERE w.status = 'completed' AND we.exercise_id = ?
    ORDER BY w.started_at DESC
    LIMIT 1
  `).get(exerciseId);

  if (!lastWorkout) return res.json({ suggest: false });

  const sets = db.prepare(`
    SELECT s.weight, s.rpe
    FROM sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    WHERE we.workout_id = ? AND we.exercise_id = ? AND s.completed = 1
    ORDER BY s.set_number
  `).all(lastWorkout.id, exerciseId);

  if (sets.length === 0) return res.json({ suggest: false });

  const allRpeLow = sets.every(s => s.rpe != null && s.rpe <= 7);
  if (!allRpeLow) return res.json({ suggest: false });

  const currentWeight = Math.max(...sets.map(s => s.weight));
  const incFlat = 2.5;
  const incPercent = currentWeight * 0.05;
  const increase = Math.max(incFlat, incPercent);
  const suggestedWeight = Math.round((currentWeight + increase) * 2) / 2; // nearest 0.5

  res.json({ suggest: true, current_weight: currentWeight, suggested_weight: suggestedWeight });
});

// ── CRUD routes ─────────────────────────────────────────────────────────────

// POST /api/workouts
router.post('/workouts', (req, res) => {
  const { template_id } = req.body;

  const active = db.prepare("SELECT id FROM workouts WHERE status = 'active' LIMIT 1").get();
  if (active) return res.status(409).json({ error: 'An active workout already exists', workout_id: active.id });

  const create = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(
      "INSERT INTO workouts (template_id, status) VALUES (?, 'active')"
    ).run(template_id || null);
    const workoutId = Number(lastInsertRowid);

    if (template_id) {
      const tplExercises = db.prepare(`
        SELECT exercise_id, sort_order, sets_count, target_reps, target_weight
        FROM template_exercises
        WHERE template_id = ?
        ORDER BY sort_order
      `).all(template_id);

      const insertWE = db.prepare(
        'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (?, ?, ?)'
      );
      const insertSet = db.prepare(
        'INSERT INTO sets (workout_exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)'
      );

      for (const te of tplExercises) {
        const { lastInsertRowid: weId } = insertWE.run(workoutId, te.exercise_id, te.sort_order);
        for (let i = 1; i <= te.sets_count; i++) {
          insertSet.run(Number(weId), i, te.target_weight, te.target_reps);
        }
      }
    }

    return workoutId;
  });

  const workoutId = create();
  res.status(201).json(getFullWorkout(workoutId));
});

// GET /api/workouts
router.get('/workouts', (req, res) => {
  const status = req.query.status;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  let where = '';
  const params = [];
  if (status) {
    where = 'WHERE w.status = ?';
    params.push(status);
  }

  const workouts = db.prepare(`
    SELECT w.id, w.template_id, w.started_at, w.finished_at, w.status, w.notes,
           t.name AS template_name,
           (SELECT COUNT(*) FROM workout_exercises we2 WHERE we2.workout_id = w.id) AS exercise_count,
           (SELECT COUNT(*) FROM sets s2 JOIN workout_exercises we3 ON we3.id = s2.workout_exercise_id WHERE we3.workout_id = w.id) AS total_sets,
           (SELECT COUNT(*) FROM sets s3 JOIN workout_exercises we4 ON we4.id = s3.workout_exercise_id WHERE we4.workout_id = w.id AND s3.completed = 1) AS completed_sets
    FROM workouts w
    LEFT JOIN templates t ON t.id = w.template_id
    ${where}
    ORDER BY w.started_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  for (const w of workouts) {
    if (w.started_at && w.finished_at) {
      const ms = new Date(w.finished_at) - new Date(w.started_at);
      w.duration_seconds = Math.round(ms / 1000);
    } else {
      w.duration_seconds = null;
    }
  }

  res.json(workouts);
});

// GET /api/workouts/:id
router.get('/workouts/:id', (req, res) => {
  const workout = getFullWorkout(Number(req.params.id));
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  res.json(workout);
});

// PATCH /api/workouts/:id
router.patch('/workouts/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Workout not found' });

  const { status, notes, finished_at } = req.body;
  const fields = [];
  const values = [];

  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  if (notes !== undefined) {
    fields.push('notes = ?');
    values.push(notes);
  }

  if (status === 'completed') {
    const fin = finished_at || new Date().toISOString().replace('T', ' ').slice(0, 19);
    fields.push('finished_at = ?');
    values.push(fin);
  } else if (finished_at !== undefined) {
    fields.push('finished_at = ?');
    values.push(finished_at);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  if (status === 'completed') {
    computePersonalRecords(id);
  }

  res.json(getFullWorkout(id));
});

// POST /api/workouts/:id/repeat
router.post('/workouts/:id/repeat', (req, res) => {
  const sourceId = Number(req.params.id);
  const source = db.prepare('SELECT * FROM workouts WHERE id = ?').get(sourceId);
  if (!source) return res.status(404).json({ error: 'Workout not found' });

  const active = db.prepare("SELECT id FROM workouts WHERE status = 'active' LIMIT 1").get();
  if (active) return res.status(409).json({ error: 'An active workout already exists', workout_id: active.id });

  const create = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(
      "INSERT INTO workouts (template_id, status) VALUES (?, 'active')"
    ).run(source.template_id);
    const workoutId = Number(lastInsertRowid);

    const exercises = db.prepare(`
      SELECT we.exercise_id, we.sort_order, we.notes
      FROM workout_exercises we
      WHERE we.workout_id = ?
      ORDER BY we.sort_order
    `).all(sourceId);

    const insertWE = db.prepare(
      'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, notes) VALUES (?, ?, ?, ?)'
    );
    const insertSet = db.prepare(
      'INSERT INTO sets (workout_exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)'
    );

    for (const ex of exercises) {
      const { lastInsertRowid: weId } = insertWE.run(workoutId, ex.exercise_id, ex.sort_order, ex.notes || '');

      // Copy last sets from source workout
      const sourceSets = db.prepare(`
        SELECT s.set_number, s.weight, s.reps
        FROM sets s
        JOIN workout_exercises swe ON swe.id = s.workout_exercise_id
        WHERE swe.workout_id = ? AND swe.exercise_id = ?
        ORDER BY s.set_number
      `).all(sourceId, ex.exercise_id);

      for (const s of sourceSets) {
        insertSet.run(Number(weId), s.set_number, s.weight, s.reps);
      }
    }

    return workoutId;
  });

  const workoutId = create();
  res.status(201).json(getFullWorkout(workoutId));
});

export default router;
