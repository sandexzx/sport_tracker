import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import exercisesRouter from './routes/exercises.js';
import templatesRouter from './routes/templates.js';
import scheduleRouter from './routes/schedule.js';
import workoutsRouter from './routes/workouts.js';
import workoutExercisesRouter from './routes/workout-exercises.js';
import setsRouter from './routes/sets.js';
import bodyRouter from './routes/body.js';
import analyticsRouter from './routes/analytics.js';
import exportRouter from './routes/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

runMigrations(db);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: true });
});

// --- Static uploads ---
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- API routes ---
app.use('/api/exercises', exercisesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/body', bodyRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/export', exportRouter);
app.use('/api', workoutsRouter);
app.use('/api/workouts/:workoutId/exercises', workoutExercisesRouter);
app.use('/api', setsRouter);

// --- Production static files ---
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
