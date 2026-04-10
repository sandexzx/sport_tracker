import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

router.get('/', (_req, res) => {
  const exercises = db.prepare('SELECT * FROM exercises').all().map((ex) => ({
    ...ex,
    muscles: db
      .prepare('SELECT muscle_name, is_primary FROM exercise_muscles WHERE exercise_id = ?')
      .all(ex.id),
  }));

  const templates = db.prepare('SELECT * FROM templates').all().map((tpl) => ({
    ...tpl,
    exercises: db
      .prepare(
        `SELECT te.*, e.name AS exercise_name
         FROM template_exercises te
         JOIN exercises e ON e.id = te.exercise_id
         WHERE te.template_id = ?
         ORDER BY te.sort_order`,
      )
      .all(tpl.id),
  }));

  const schedule = db.prepare('SELECT * FROM schedule').all();

  const workouts = db.prepare('SELECT * FROM workouts').all().map((w) => ({
    ...w,
    exercises: db
      .prepare(
        `SELECT we.*, e.name AS exercise_name
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = ?
         ORDER BY we.sort_order`,
      )
      .all(w.id)
      .map((we) => ({
        ...we,
        sets: db
          .prepare('SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number')
          .all(we.id),
      })),
  }));

  const body_checkpoints = db.prepare('SELECT * FROM body_checkpoints').all().map((cp) => ({
    ...cp,
    photos: db
      .prepare('SELECT id, photo_type, file_path, created_at FROM progress_photos WHERE checkpoint_id = ?')
      .all(cp.id),
  }));

  const personal_records = db.prepare('SELECT * FROM personal_records').all();

  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=sport_tracker_export_${date}.json`);

  res.json({
    exported_at: new Date().toISOString(),
    exercises,
    templates,
    schedule,
    workouts,
    body_checkpoints,
    personal_records,
  });
});

export default router;
