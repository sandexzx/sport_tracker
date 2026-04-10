import { Router } from 'express';
import { z } from 'zod';
import db from '../db/connection.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// ─── Schema ─────────────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  assignments: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    template_id: z.number().int().positive(),
  })),
});

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── Prepared statements ────────────────────────────────────────────────────

const getScheduleStmt = db.prepare(`
  SELECT s.id AS schedule_id, s.weekday, s.template_id, t.name
  FROM schedule s
  JOIN templates t ON t.id = s.template_id
  ORDER BY s.weekday, s.id
`);

const deleteAllScheduleStmt = db.prepare('DELETE FROM schedule');

const insertScheduleStmt = db.prepare(
  'INSERT INTO schedule (weekday, template_id) VALUES (?, ?)'
);

const templateExistsStmt = db.prepare(
  'SELECT id FROM templates WHERE id = ?'
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildWeek() {
  const rows = getScheduleStmt.all();
  const week = DAY_NAMES.map((day_name, weekday) => ({
    weekday,
    day_name,
    templates: [],
  }));
  for (const row of rows) {
    week[row.weekday].templates.push({
      id: row.template_id,
      schedule_id: row.schedule_id,
      name: row.name,
    });
  }
  return week;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/schedule — full week
router.get('/', (_req, res) => {
  res.json(buildWeek());
});

// PUT /api/schedule — replace entire schedule
router.put('/', validate(scheduleSchema), (req, res) => {
  const { assignments } = req.validated;

  // Validate that all referenced templates exist
  for (const a of assignments) {
    if (!templateExistsStmt.get(a.template_id)) {
      return res.status(400).json({
        error: `Template with id ${a.template_id} not found`,
      });
    }
  }

  const replaceSchedule = db.transaction(() => {
    deleteAllScheduleStmt.run();
    for (const a of assignments) {
      insertScheduleStmt.run(a.weekday, a.template_id);
    }
  });

  replaceSchedule();
  res.json(buildWeek());
});

export default router;
