import { Router } from 'express';
import { z } from 'zod';
import db from '../db/connection.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const templateExerciseSchema = z.object({
  exercise_id: z.number().int().positive(),
  sort_order: z.number().int().min(0),
  sets_count: z.number().int().min(1).default(3),
  target_reps: z.number().int().min(1).default(10),
  target_weight: z.number().min(0).default(0),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  exercises: z.array(templateExerciseSchema).default([]),
});

// ─── Prepared statements ────────────────────────────────────────────────────

const listTemplatesStmt = db.prepare(`
  SELECT t.id, t.name, t.description,
         COUNT(te.id) AS exercise_count,
         t.created_at, t.updated_at
  FROM templates t
  LEFT JOIN template_exercises te ON te.template_id = t.id
  GROUP BY t.id
  ORDER BY t.id
`);

const getTemplateStmt = db.prepare(`
  SELECT id, name, description, created_at, updated_at
  FROM templates WHERE id = ?
`);

const getTemplateExercisesStmt = db.prepare(`
  SELECT te.id, te.exercise_id, e.name AS exercise_name, e.emoji AS exercise_emoji,
         te.sort_order, te.sets_count, te.target_reps, te.target_weight
  FROM template_exercises te
  JOIN exercises e ON e.id = te.exercise_id
  WHERE te.template_id = ?
  ORDER BY te.sort_order
`);

const insertTemplateStmt = db.prepare(`
  INSERT INTO templates (name, description) VALUES (?, ?)
`);

const updateTemplateStmt = db.prepare(`
  UPDATE templates SET name = ?, description = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const deleteTemplateExercisesStmt = db.prepare(`
  DELETE FROM template_exercises WHERE template_id = ?
`);

const insertTemplateExerciseStmt = db.prepare(`
  INSERT INTO template_exercises (template_id, exercise_id, sort_order, sets_count, target_reps, target_weight)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const deleteTemplateStmt = db.prepare(`
  DELETE FROM templates WHERE id = ?
`);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTemplateWithExercises(id) {
  const template = getTemplateStmt.get(id);
  if (!template) return null;
  template.exercises = getTemplateExercisesStmt.all(id);
  return template;
}

const insertExerciseRows = db.transaction((templateId, exercises) => {
  for (const ex of exercises) {
    insertTemplateExerciseStmt.run(
      templateId, ex.exercise_id, ex.sort_order,
      ex.sets_count, ex.target_reps, ex.target_weight,
    );
  }
});

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/templates — list all templates with exercise count
router.get('/', (_req, res) => {
  const templates = listTemplatesStmt.all();
  res.json(templates);
});

// GET /api/templates/:id — single template with exercises
router.get('/:id', (req, res) => {
  const template = getTemplateWithExercises(Number(req.params.id));
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// POST /api/templates — create template
router.post('/', validate(templateSchema), (req, res) => {
  const { name, description, exercises } = req.validated;

  const createTemplate = db.transaction(() => {
    const { lastInsertRowid } = insertTemplateStmt.run(name, description);
    const templateId = Number(lastInsertRowid);
    insertExerciseRows(templateId, exercises);
    return templateId;
  });

  const templateId = createTemplate();
  const created = getTemplateWithExercises(templateId);
  res.status(201).json(created);
});

// PUT /api/templates/:id — update template
router.put('/:id', validate(templateSchema), (req, res) => {
  const id = Number(req.params.id);
  const existing = getTemplateStmt.get(id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });

  const { name, description, exercises } = req.validated;

  const updateTemplate = db.transaction(() => {
    updateTemplateStmt.run(name, description, id);
    deleteTemplateExercisesStmt.run(id);
    insertExerciseRows(id, exercises);
  });

  updateTemplate();
  const updated = getTemplateWithExercises(id);
  res.json(updated);
});

// DELETE /api/templates/:id — delete template
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { changes } = deleteTemplateStmt.run(id);
  if (changes === 0) return res.status(404).json({ error: 'Template not found' });
  res.json({ success: true });
});

export default router;
