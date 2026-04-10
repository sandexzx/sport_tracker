import db from './connection.js';
import { runMigrations } from './migrate.js';

// Ensure schema exists before seeding
runMigrations(db);

// ─── Helpers ────────────────────────────────────────────────────────────────

function isEmpty(table) {
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c === 0;
}

function daysAgo(n, hour = 10, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

// ─── Exercises ──────────────────────────────────────────────────────────────

const EXERCISES = [
  { name: 'Жим штанги лёжа',       emoji: '🏋️', rest: 120, muscles: [['Грудь',1],['Трицепс',0],['Плечи',0]] },
  { name: 'Жим гантелей лёжа',     emoji: '🏋️', rest: 90,  muscles: [['Грудь',1],['Трицепс',0],['Плечи',0]] },
  { name: 'Приседания со штангой',   emoji: '🦵', rest: 150, muscles: [['Квадрицепс',1],['Ягодицы',0],['Бицепс бедра',0]] },
  { name: 'Становая тяга',          emoji: '🏋️', rest: 180, muscles: [['Спина',1],['Ягодицы',0],['Бицепс бедра',0]] },
  { name: 'Тяга штанги в наклоне',  emoji: '🏋️', rest: 90,  muscles: [['Спина',1],['Бицепс',0]] },
  { name: 'Подтягивания',           emoji: '💪', rest: 90,  muscles: [['Спина',1],['Бицепс',0]] },
  { name: 'Жим штанги стоя',        emoji: '🏋️', rest: 90,  muscles: [['Плечи',1],['Трицепс',0]] },
  { name: 'Подъём штанги на бицепс', emoji: '💪', rest: 60, muscles: [['Бицепс',1]] },
  { name: 'Французский жим',        emoji: '💪', rest: 60,  muscles: [['Трицепс',1]] },
  { name: 'Разгибания ног',         emoji: '🦵', rest: 60,  muscles: [['Квадрицепс',1]] },
  { name: 'Сгибания ног',           emoji: '🦵', rest: 60,  muscles: [['Бицепс бедра',1]] },
  { name: 'Подъём на носки',        emoji: '🦵', rest: 45,  muscles: [['Икры',1]] },
  { name: 'Скручивания',            emoji: '🔥', rest: 45,  muscles: [['Пресс',1]] },
  { name: 'Отжимания',              emoji: '💪', rest: 60,  muscles: [['Грудь',1],['Трицепс',0],['Плечи',0]] },
];

const insertExercise = db.prepare(
  'INSERT INTO exercises (name, emoji, rest_timer_seconds) VALUES (?, ?, ?)'
);
const insertMuscle = db.prepare(
  'INSERT INTO exercise_muscles (exercise_id, muscle_name, is_primary) VALUES (?, ?, ?)'
);

function seedExercises() {
  if (!isEmpty('exercises')) {
    console.log('[seed] exercises already seeded, skipping.');
    return;
  }

  const insertAll = db.transaction(() => {
    for (const ex of EXERCISES) {
      const { lastInsertRowid } = insertExercise.run(ex.name, ex.emoji, ex.rest);
      for (const [muscle, isPrimary] of ex.muscles) {
        insertMuscle.run(Number(lastInsertRowid), muscle, isPrimary);
      }
    }
  });
  insertAll();
  console.log(`[seed] Inserted ${EXERCISES.length} exercises with muscle mappings.`);
}

// ─── Templates ──────────────────────────────────────────────────────────────

function getExerciseId(name) {
  return db.prepare('SELECT id FROM exercises WHERE name = ?').get(name)?.id;
}

const TEMPLATES = [
  {
    name: 'Верх тела',
    description: 'Грудь, спина, плечи, руки',
    exercises: [
      { name: 'Жим штанги лёжа',       sets: 4, reps: 8,  weight: 60 },
      { name: 'Тяга штанги в наклоне',  sets: 4, reps: 8,  weight: 50 },
      { name: 'Жим штанги стоя',        sets: 3, reps: 10, weight: 35 },
      { name: 'Подъём штанги на бицепс', sets: 3, reps: 12, weight: 25 },
      { name: 'Французский жим',        sets: 3, reps: 12, weight: 20 },
    ],
  },
  {
    name: 'Низ тела',
    description: 'Ноги, ягодицы, икры, пресс',
    exercises: [
      { name: 'Приседания со штангой', sets: 4, reps: 8,  weight: 80 },
      { name: 'Становая тяга',        sets: 4, reps: 6,  weight: 90 },
      { name: 'Разгибания ног',       sets: 3, reps: 12, weight: 40 },
      { name: 'Сгибания ног',         sets: 3, reps: 12, weight: 30 },
      { name: 'Подъём на носки',       sets: 3, reps: 15, weight: 50 },
      { name: 'Скручивания',          sets: 3, reps: 20, weight: 0 },
    ],
  },
  {
    name: 'Фулбоди',
    description: 'Всё тело за одну тренировку',
    exercises: [
      { name: 'Приседания со штангой', sets: 3, reps: 8,  weight: 70 },
      { name: 'Жим штанги лёжа',      sets: 3, reps: 8,  weight: 55 },
      { name: 'Подтягивания',         sets: 3, reps: 8,  weight: 0 },
      { name: 'Жим штанги стоя',      sets: 3, reps: 10, weight: 30 },
      { name: 'Подъём штанги на бицепс', sets: 2, reps: 12, weight: 20 },
      { name: 'Скручивания',          sets: 2, reps: 20, weight: 0 },
    ],
  },
];

const insertTemplate = db.prepare('INSERT INTO templates (name, description) VALUES (?, ?)');
const insertTemplateExercise = db.prepare(
  `INSERT INTO template_exercises (template_id, exercise_id, sort_order, sets_count, target_reps, target_weight)
   VALUES (?, ?, ?, ?, ?, ?)`
);

function seedTemplates() {
  if (!isEmpty('templates')) {
    console.log('[seed] templates already seeded, skipping.');
    return;
  }

  const insertAll = db.transaction(() => {
    for (const tpl of TEMPLATES) {
      const { lastInsertRowid: tplId } = insertTemplate.run(tpl.name, tpl.description);
      tpl.exercises.forEach((ex, i) => {
        const exId = getExerciseId(ex.name);
        if (!exId) throw new Error(`Exercise not found: ${ex.name}`);
        insertTemplateExercise.run(Number(tplId), exId, i, ex.sets, ex.reps, ex.weight);
      });
    }
  });
  insertAll();
  console.log(`[seed] Inserted ${TEMPLATES.length} templates.`);
}

// ─── Schedule ───────────────────────────────────────────────────────────────

function getTemplateId(name) {
  return db.prepare('SELECT id FROM templates WHERE name = ?').get(name)?.id;
}

const insertSchedule = db.prepare('INSERT INTO schedule (weekday, template_id) VALUES (?, ?)');

function seedSchedule() {
  if (!isEmpty('schedule')) {
    console.log('[seed] schedule already seeded, skipping.');
    return;
  }
  // Mon=1 Upper, Wed=3 Lower, Fri=5 Fullbody
  const schedule = [
    { weekday: 1, template: 'Верх тела' },
    { weekday: 3, template: 'Низ тела' },
    { weekday: 5, template: 'Фулбоди' },
  ];

  const insertAll = db.transaction(() => {
    for (const s of schedule) {
      const tplId = getTemplateId(s.template);
      if (!tplId) throw new Error(`Template not found: ${s.template}`);
      insertSchedule.run(s.weekday, tplId);
    }
  });
  insertAll();
  console.log('[seed] Inserted weekly schedule.');
}

// ─── Workouts ───────────────────────────────────────────────────────────────

const insertWorkout = db.prepare(
  `INSERT INTO workouts (template_id, started_at, finished_at, status) VALUES (?, ?, ?, 'completed')`
);
const insertWorkoutExercise = db.prepare(
  'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (?, ?, ?)'
);
const insertSet = db.prepare(
  `INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe, completed, completed_at)
   VALUES (?, ?, ?, ?, ?, 1, ?)`
);

function seedWorkouts() {
  if (!isEmpty('workouts')) {
    console.log('[seed] workouts already seeded, skipping.');
    return;
  }

  // Realistic workout data spread over last 2 weeks
  const workoutData = [
    {
      template: 'Верх тела',
      daysAgo: 12,
      hour: 10,
      durationMin: 55,
      exercises: [
        { name: 'Жим штанги лёжа',       sets: [[60,8,7],[60,8,7.5],[60,7,8],[55,8,7]] },
        { name: 'Тяга штанги в наклоне',  sets: [[50,8,7],[50,8,7],[50,7,7.5],[50,7,8]] },
        { name: 'Жим штанги стоя',        sets: [[35,10,7],[35,9,7.5],[35,8,8]] },
        { name: 'Подъём штанги на бицепс', sets: [[25,12,7],[25,11,7.5],[25,10,8]] },
        { name: 'Французский жим',        sets: [[20,12,7],[20,11,7],[20,10,7.5]] },
      ],
    },
    {
      template: 'Низ тела',
      daysAgo: 10,
      hour: 18,
      durationMin: 65,
      exercises: [
        { name: 'Приседания со штангой', sets: [[80,8,7],[80,8,7.5],[80,7,8],[75,8,7]] },
        { name: 'Становая тяга',        sets: [[90,6,7],[90,6,7.5],[90,5,8],[85,6,7.5]] },
        { name: 'Разгибания ног',       sets: [[40,12,7],[40,12,7],[40,11,7.5]] },
        { name: 'Сгибания ног',         sets: [[30,12,7],[30,12,7],[30,11,7.5]] },
        { name: 'Подъём на носки',       sets: [[50,15,6],[50,15,6.5],[50,14,7]] },
        { name: 'Скручивания',          sets: [[0,20,6],[0,20,6.5],[0,18,7]] },
      ],
    },
    {
      template: 'Фулбоди',
      daysAgo: 8,
      hour: 11,
      durationMin: 50,
      exercises: [
        { name: 'Приседания со штангой', sets: [[70,8,7],[70,8,7.5],[70,7,8]] },
        { name: 'Жим штанги лёжа',      sets: [[55,8,7],[55,8,7],[55,7,7.5]] },
        { name: 'Подтягивания',         sets: [[0,8,7],[0,7,7.5],[0,6,8]] },
        { name: 'Жим штанги стоя',      sets: [[30,10,7],[30,10,7],[30,9,7.5]] },
        { name: 'Подъём штанги на бицепс', sets: [[20,12,6.5],[20,12,7]] },
        { name: 'Скручивания',          sets: [[0,20,6],[0,18,7]] },
      ],
    },
    {
      template: 'Верх тела',
      daysAgo: 5,
      hour: 10,
      durationMin: 60,
      exercises: [
        { name: 'Жим штанги лёжа',       sets: [[62.5,8,7],[62.5,7,7.5],[60,8,7],[60,8,7.5]] },
        { name: 'Тяга штанги в наклоне',  sets: [[52.5,8,7],[52.5,7,7.5],[50,8,7],[50,8,7]] },
        { name: 'Жим штанги стоя',        sets: [[37.5,10,7],[37.5,9,7.5],[35,10,7]] },
        { name: 'Подъём штанги на бицепс', sets: [[27.5,10,7.5],[25,12,7],[25,11,7.5]] },
        { name: 'Французский жим',        sets: [[22.5,10,7.5],[20,12,7],[20,11,7.5]] },
      ],
    },
    {
      template: 'Низ тела',
      daysAgo: 3,
      hour: 18,
      durationMin: 70,
      exercises: [
        { name: 'Приседания со штангой', sets: [[82.5,8,7],[82.5,7,8],[80,8,7.5],[80,8,7.5]] },
        { name: 'Становая тяга',        sets: [[95,5,8],[90,6,7.5],[90,6,7.5],[90,5,8]] },
        { name: 'Разгибания ног',       sets: [[42.5,12,7],[42.5,11,7.5],[40,12,7]] },
        { name: 'Сгибания ног',         sets: [[32.5,12,7],[32.5,11,7.5],[30,12,7]] },
        { name: 'Подъём на носки',       sets: [[55,15,7],[55,14,7],[50,15,6.5]] },
        { name: 'Скручивания',          sets: [[0,22,6.5],[0,20,7],[0,20,7]] },
      ],
    },
  ];

  const insertAll = db.transaction(() => {
    for (const w of workoutData) {
      const tplId = getTemplateId(w.template);
      const startedAt = daysAgo(w.daysAgo, w.hour, 0);
      const finishedAt = daysAgo(w.daysAgo, w.hour, w.durationMin);
      const { lastInsertRowid: workoutId } = insertWorkout.run(tplId, startedAt, finishedAt);

      w.exercises.forEach((ex, sortOrder) => {
        const exId = getExerciseId(ex.name);
        if (!exId) throw new Error(`Exercise not found: ${ex.name}`);
        const { lastInsertRowid: weId } = insertWorkoutExercise.run(
          Number(workoutId), exId, sortOrder
        );

        ex.sets.forEach(([weight, reps, rpe], setIdx) => {
          insertSet.run(Number(weId), setIdx + 1, weight, reps, rpe, startedAt);
        });
      });
    }
  });
  insertAll();
  console.log(`[seed] Inserted ${workoutData.length} completed workouts.`);
}

// ─── Body Checkpoints ───────────────────────────────────────────────────────

const insertCheckpoint = db.prepare(
  `INSERT INTO body_checkpoints (date, weight, chest, waist, bicep, thighs, neck, calves, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

function seedBodyCheckpoints() {
  if (!isEmpty('body_checkpoints')) {
    console.log('[seed] body_checkpoints already seeded, skipping.');
    return;
  }

  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  const checkpoints = [
    {
      date: twoWeeksAgo.toISOString().slice(0, 10),
      weight: 82.5, chest: 102, waist: 84, bicep: 36.5, thighs: 58, neck: 39, calves: 37,
      notes: 'Начало отслеживания',
    },
    {
      date: today.toISOString().slice(0, 10),
      weight: 82.0, chest: 102.5, waist: 83.5, bicep: 37, thighs: 58.5, neck: 39, calves: 37,
      notes: 'Небольшой прогресс',
    },
  ];

  const insertAll = db.transaction(() => {
    for (const cp of checkpoints) {
      insertCheckpoint.run(
        cp.date, cp.weight, cp.chest, cp.waist, cp.bicep, cp.thighs, cp.neck, cp.calves, cp.notes
      );
    }
  });
  insertAll();
  console.log(`[seed] Inserted ${checkpoints.length} body checkpoints.`);
}

// ─── Personal Records ───────────────────────────────────────────────────────

const upsertPR = db.prepare(
  `INSERT INTO personal_records (exercise_id, record_type, value, workout_id, achieved_at)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(exercise_id, record_type) DO UPDATE SET
     value = CASE WHEN excluded.value > personal_records.value THEN excluded.value ELSE personal_records.value END,
     workout_id = CASE WHEN excluded.value > personal_records.value THEN excluded.workout_id ELSE personal_records.workout_id END,
     achieved_at = CASE WHEN excluded.value > personal_records.value THEN excluded.achieved_at ELSE personal_records.achieved_at END`
);

function seedPersonalRecords() {
  if (!isEmpty('personal_records')) {
    console.log('[seed] personal_records already seeded, skipping.');
    return;
  }

  // Compute PRs from seeded workout data
  const workouts = db.prepare(
    `SELECT w.id AS workout_id, w.started_at, we.exercise_id,
            s.weight, s.reps
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     JOIN sets s ON s.workout_exercise_id = we.id
     WHERE s.completed = 1`
  ).all();

  // Group by exercise
  const byExercise = new Map();
  for (const row of workouts) {
    if (!byExercise.has(row.exercise_id)) byExercise.set(row.exercise_id, []);
    byExercise.get(row.exercise_id).push(row);
  }

  const insertAll = db.transaction(() => {
    for (const [exerciseId, rows] of byExercise) {
      let bestWeight = { value: 0, workoutId: null, at: '' };
      let best1rm = { value: 0, workoutId: null, at: '' };
      let bestVolume = { value: 0, workoutId: null, at: '' };

      // Group rows by workout for volume calculation
      const byWorkout = new Map();
      for (const r of rows) {
        if (!byWorkout.has(r.workout_id)) byWorkout.set(r.workout_id, { sets: [], at: r.started_at });
        byWorkout.get(r.workout_id).sets.push(r);
      }

      for (const [workoutId, { sets, at }] of byWorkout) {
        let volume = 0;
        for (const s of sets) {
          // Max weight
          if (s.weight > bestWeight.value) {
            bestWeight = { value: s.weight, workoutId: workoutId, at };
          }
          // Estimated 1RM (Brzycki formula)
          if (s.weight > 0 && s.reps > 0 && s.reps <= 12) {
            const e1rm = Math.round(s.weight * (36 / (37 - s.reps)) * 10) / 10;
            if (e1rm > best1rm.value) {
              best1rm = { value: e1rm, workoutId: workoutId, at };
            }
          }
          volume += s.weight * s.reps;
        }
        if (volume > bestVolume.value) {
          bestVolume = { value: volume, workoutId: workoutId, at };
        }
      }

      if (bestWeight.value > 0) {
        upsertPR.run(exerciseId, 'weight', bestWeight.value, bestWeight.workoutId, bestWeight.at);
      }
      if (best1rm.value > 0) {
        upsertPR.run(exerciseId, 'estimated_1rm', best1rm.value, best1rm.workoutId, best1rm.at);
      }
      if (bestVolume.value > 0) {
        upsertPR.run(exerciseId, 'volume', bestVolume.value, bestVolume.workoutId, bestVolume.at);
      }
    }
  });
  insertAll();

  const prCount = db.prepare('SELECT COUNT(*) AS c FROM personal_records').get().c;
  console.log(`[seed] Computed ${prCount} personal records from workout data.`);
}

// ─── Run all ────────────────────────────────────────────────────────────────

seedExercises();
seedTemplates();
seedSchedule();
seedWorkouts();
seedBodyCheckpoints();
seedPersonalRecords();

console.log('[seed] Done.');
db.close();
