import { Router } from 'express';
import db from '../db/connection.js';

const router = Router({ mergeParams: true });

// POST /api/workouts/:workoutId/exercises
router.post('/', (req, res) => {
  const workoutId = Number(req.params.workoutId);
  const { exercise_id } = req.body;

  const workout = db.prepare('SELECT id FROM workouts WHERE id = ?').get(workoutId);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) AS m FROM workout_exercises WHERE workout_id = ?'
  ).get(workoutId).m;

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (?, ?, ?)'
  ).run(workoutId, exercise_id, maxOrder + 1);

  const created = db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(Number(lastInsertRowid));
  res.status(201).json(created);
});

// PUT /api/workouts/:workoutId/exercises/reorder
router.put('/reorder', (req, res) => {
  const workoutId = Number(req.params.workoutId);
  const { order } = req.body;

  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

  const update = db.prepare('UPDATE workout_exercises SET sort_order = ? WHERE id = ? AND workout_id = ?');

  const reorder = db.transaction(() => {
    order.forEach((weId, idx) => {
      update.run(idx, weId, workoutId);
    });
  });

  reorder();
  res.json({ success: true });
});

// PATCH /api/workouts/:workoutId/exercises/:weId
router.patch('/:weId', (req, res) => {
  const workoutId = Number(req.params.workoutId);
  const weId = Number(req.params.weId);
  const { notes, sort_order } = req.body;

  const existing = db.prepare(
    'SELECT * FROM workout_exercises WHERE id = ? AND workout_id = ?'
  ).get(weId, workoutId);
  if (!existing) return res.status(404).json({ error: 'Workout exercise not found' });

  const fields = [];
  const values = [];
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }

  if (fields.length > 0) {
    values.push(weId);
    db.prepare(`UPDATE workout_exercises SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(weId);
  res.json(updated);
});

// DELETE /api/workouts/:workoutId/exercises/:weId
router.delete('/:weId', (req, res) => {
  const workoutId = Number(req.params.workoutId);
  const weId = Number(req.params.weId);

  const existing = db.prepare(
    'SELECT id FROM workout_exercises WHERE id = ? AND workout_id = ?'
  ).get(weId, workoutId);
  if (!existing) return res.status(404).json({ error: 'Workout exercise not found' });

  db.prepare('DELETE FROM workout_exercises WHERE id = ?').run(weId);
  res.status(204).end();
});

export default router;
