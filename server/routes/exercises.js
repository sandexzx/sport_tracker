import { Router } from 'express';
import db from '../db/connection.js';
import { exerciseSchema } from '../validation/schemas.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMuscles(exerciseId) {
  return db.prepare(
    'SELECT muscle_name AS name, is_primary FROM exercise_muscles WHERE exercise_id = ?'
  ).all(exerciseId).map(m => ({ ...m, is_primary: !!m.is_primary }));
}

function formatExercise(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    technique_notes: row.technique_notes,
    rest_timer_seconds: row.rest_timer_seconds,
    created_at: row.created_at,
    updated_at: row.updated_at,
    muscles: getMuscles(row.id),
  };
}

// ─── GET /api/exercises ─────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const { search, muscle } = req.query;

  let sql = 'SELECT DISTINCT e.* FROM exercises e';
  const params = [];

  if (muscle) {
    sql += ' JOIN exercise_muscles em ON em.exercise_id = e.id';
  }

  const conditions = [];

  if (search) {
    conditions.push('e.name LIKE ?');
    params.push(`%${search}%`);
  }

  if (muscle) {
    conditions.push('em.muscle_name = ?');
    params.push(muscle);
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY e.id';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(formatExercise));
});

// ─── GET /api/exercises/:id ─────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Exercise not found' });
  res.json(formatExercise(row));
});

// ─── POST /api/exercises ────────────────────────────────────────────────────

const insertExercise = db.prepare(
  'INSERT INTO exercises (name, emoji, technique_notes, rest_timer_seconds) VALUES (?, ?, ?, ?)'
);
const insertMuscle = db.prepare(
  'INSERT INTO exercise_muscles (exercise_id, muscle_name, is_primary) VALUES (?, ?, ?)'
);

const createExercise = db.transaction((data) => {
  const { lastInsertRowid } = insertExercise.run(
    data.name, data.emoji, data.technique_notes, data.rest_timer_seconds
  );
  const id = Number(lastInsertRowid);
  for (const m of data.muscles) {
    insertMuscle.run(id, m.name, m.is_primary ? 1 : 0);
  }
  return id;
});

router.post('/', validate(exerciseSchema), (req, res) => {
  const id = createExercise(req.validated);
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
  res.status(201).json(formatExercise(row));
});

// ─── PUT /api/exercises/:id ─────────────────────────────────────────────────

const updateExercise = db.prepare(
  `UPDATE exercises SET name = ?, emoji = ?, technique_notes = ?, rest_timer_seconds = ?,
   updated_at = datetime('now') WHERE id = ?`
);
const deleteMuscles = db.prepare('DELETE FROM exercise_muscles WHERE exercise_id = ?');

const updateExerciseTx = db.transaction((id, data) => {
  const info = updateExercise.run(
    data.name, data.emoji, data.technique_notes, data.rest_timer_seconds, id
  );
  if (info.changes === 0) return false;
  deleteMuscles.run(id);
  for (const m of data.muscles) {
    insertMuscle.run(id, m.name, m.is_primary ? 1 : 0);
  }
  return true;
});

router.put('/:id', validate(exerciseSchema), (req, res) => {
  const id = Number(req.params.id);
  const found = updateExerciseTx(id, req.validated);
  if (!found) return res.status(404).json({ error: 'Exercise not found' });
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
  res.json(formatExercise(row));
});

// ─── DELETE /api/exercises/:id ──────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Exercise not found' });

  // Check if used in templates
  const inTemplate = db.prepare(
    'SELECT COUNT(*) AS c FROM template_exercises WHERE exercise_id = ?'
  ).get(id);
  if (inTemplate.c > 0) {
    return res.status(409).json({ error: 'Упражнение используется в шаблонах тренировок' });
  }

  // Check if used in active workouts
  const inActiveWorkout = db.prepare(
    `SELECT COUNT(*) AS c FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.status = 'active'`
  ).get(id);
  if (inActiveWorkout.c > 0) {
    return res.status(409).json({ error: 'Упражнение используется в активной тренировке' });
  }

  db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
