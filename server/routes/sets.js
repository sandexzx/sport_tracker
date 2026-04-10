import { Router } from 'express';
import db from '../db/connection.js';

const router = Router({ mergeParams: true });

// POST /api/workout-exercises/:weid/sets
router.post('/workout-exercises/:weid/sets', (req, res) => {
  const weid = Number(req.params.weid);

  const we = db.prepare('SELECT id FROM workout_exercises WHERE id = ?').get(weid);
  if (!we) return res.status(404).json({ error: 'Workout exercise not found' });

  const { weight = 0, reps = 0, rpe, is_warmup = 0 } = req.body;

  const maxNum = db.prepare(
    'SELECT COALESCE(MAX(set_number), 0) AS m FROM sets WHERE workout_exercise_id = ?'
  ).get(weid).m;

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe, is_warmup) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(weid, maxNum + 1, weight, reps, rpe ?? null, is_warmup);

  const created = db.prepare('SELECT * FROM sets WHERE id = ?').get(Number(lastInsertRowid));
  res.status(201).json(created);
});

// PATCH /api/sets/:id/complete  (must be before /:id to avoid conflicts)
router.patch('/sets/:id/complete', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM sets WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });

  db.prepare("UPDATE sets SET completed = 1, completed_at = datetime('now') WHERE id = ?").run(id);

  const updated = db.prepare('SELECT * FROM sets WHERE id = ?').get(id);
  res.json(updated);
});

// PATCH /api/sets/:id
router.patch('/sets/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM sets WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });

  const { weight, reps, rpe, is_warmup } = req.body;
  const fields = [];
  const values = [];

  if (weight !== undefined) { fields.push('weight = ?'); values.push(weight); }
  if (reps !== undefined) { fields.push('reps = ?'); values.push(reps); }
  if (rpe !== undefined) { fields.push('rpe = ?'); values.push(rpe); }
  if (is_warmup !== undefined) { fields.push('is_warmup = ?'); values.push(is_warmup); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE sets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM sets WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/sets/:id
router.delete('/sets/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM sets WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });

  db.prepare('DELETE FROM sets WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
