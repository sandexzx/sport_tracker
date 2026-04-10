import { Router } from 'express';
import fs from 'fs';
import sharp from 'sharp';
import { z } from 'zod';
import db from '../db/connection.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// --- Validation schemas ---

const checkpointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weight: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  bicep: z.number().positive().optional(),
  thighs: z.number().positive().optional(),
  neck: z.number().positive().optional(),
  calves: z.number().positive().optional(),
  notes: z.string().optional(),
});

const updateSchema = checkpointSchema.partial().omit({ date: true });

const photoTypeSchema = z.enum(['front', 'back', 'side_left', 'side_right']);

// --- Prepared statements ---

const listCheckpoints = db.prepare(
  'SELECT * FROM body_checkpoints ORDER BY date DESC'
);

const getCheckpointById = db.prepare(
  'SELECT * FROM body_checkpoints WHERE id = ?'
);

const getPhotosByCheckpointId = db.prepare(
  'SELECT id, photo_type, file_path FROM progress_photos WHERE checkpoint_id = ?'
);

const insertCheckpoint = db.prepare(
  `INSERT INTO body_checkpoints (date, weight, chest, waist, bicep, thighs, neck, calves, notes)
   VALUES (@date, @weight, @chest, @waist, @bicep, @thighs, @neck, @calves, @notes)`
);

const updateCheckpoint = db.prepare(
  `UPDATE body_checkpoints SET
     weight = COALESCE(@weight, weight),
     chest = COALESCE(@chest, chest),
     waist = COALESCE(@waist, waist),
     bicep = COALESCE(@bicep, bicep),
     thighs = COALESCE(@thighs, thighs),
     neck = COALESCE(@neck, neck),
     calves = COALESCE(@calves, calves),
     notes = COALESCE(@notes, notes)
   WHERE id = @id`
);

const deleteCheckpointById = db.prepare(
  'DELETE FROM body_checkpoints WHERE id = ?'
);

const insertPhoto = db.prepare(
  `INSERT INTO progress_photos (checkpoint_id, photo_type, file_path)
   VALUES (?, ?, ?)`
);

const getPhotoById = db.prepare(
  'SELECT * FROM progress_photos WHERE id = ? AND checkpoint_id = ?'
);

const deletePhotoById = db.prepare(
  'DELETE FROM progress_photos WHERE id = ? AND checkpoint_id = ?'
);

// --- Helpers ---

function attachPhotos(checkpoint) {
  const photos = getPhotosByCheckpointId.all(checkpoint.id);
  return { ...checkpoint, photos };
}

// --- Routes ---

// GET /api/body — list all checkpoints with photos
router.get('/', (_req, res) => {
  const checkpoints = listCheckpoints.all().map(attachPhotos);
  res.json(checkpoints);
});

// GET /api/body/:id — single checkpoint with photos
router.get('/:id', (req, res) => {
  const checkpoint = getCheckpointById.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });
  res.json(attachPhotos(checkpoint));
});

// POST /api/body — create checkpoint
router.post('/', (req, res) => {
  const parsed = checkpointSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const data = {
    date: parsed.data.date,
    weight: parsed.data.weight ?? null,
    chest: parsed.data.chest ?? null,
    waist: parsed.data.waist ?? null,
    bicep: parsed.data.bicep ?? null,
    thighs: parsed.data.thighs ?? null,
    neck: parsed.data.neck ?? null,
    calves: parsed.data.calves ?? null,
    notes: parsed.data.notes ?? '',
  };

  try {
    const result = insertCheckpoint.run(data);
    const created = getCheckpointById.get(result.lastInsertRowid);
    res.status(201).json(attachPhotos(created));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A checkpoint for this date already exists' });
    }
    throw err;
  }
});

// PUT /api/body/:id — update checkpoint
router.put('/:id', (req, res) => {
  const checkpoint = getCheckpointById.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  updateCheckpoint.run({
    id: req.params.id,
    weight: parsed.data.weight ?? null,
    chest: parsed.data.chest ?? null,
    waist: parsed.data.waist ?? null,
    bicep: parsed.data.bicep ?? null,
    thighs: parsed.data.thighs ?? null,
    neck: parsed.data.neck ?? null,
    calves: parsed.data.calves ?? null,
    notes: parsed.data.notes ?? null,
  });

  const updated = getCheckpointById.get(req.params.id);
  res.json(attachPhotos(updated));
});

// DELETE /api/body/:id — delete checkpoint + photos from disk
router.delete('/:id', (req, res) => {
  const checkpoint = getCheckpointById.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });

  // Get file paths before deleting from DB
  const photos = getPhotosByCheckpointId.all(req.params.id);
  const filePaths = photos.map((p) => p.file_path);

  // Delete from DB (CASCADE will remove progress_photos rows)
  deleteCheckpointById.run(req.params.id);

  // Delete files from disk
  for (const fp of filePaths) {
    try { fs.unlinkSync(fp); } catch { /* file may already be gone */ }
  }

  res.json({ success: true });
});

// POST /api/body/:id/photos — upload a photo
router.post('/:id/photos', upload.single('photo'), async (req, res) => {
  const checkpoint = getCheckpointById.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });

  const typeResult = photoTypeSchema.safeParse(req.body?.photo_type);
  if (!typeResult.success) {
    // Clean up uploaded file on validation failure
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(400).json({ error: 'photo_type must be one of: front, back, side_left, side_right' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No photo file uploaded' });
  }

  // Resize image
  const resizedPath = req.file.path.replace(/(\.\w+)$/, '_resized$1');
  await sharp(req.file.path)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(resizedPath);

  fs.unlinkSync(req.file.path);
  fs.renameSync(resizedPath, req.file.path);

  const result = insertPhoto.run(req.params.id, typeResult.data, req.file.path);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    photo_type: typeResult.data,
    file_path: req.file.path,
  });
});

// DELETE /api/body/:id/photos/:photoId — delete a photo
router.delete('/:id/photos/:photoId', (req, res) => {
  const photo = getPhotoById.get(req.params.photoId, req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  deletePhotoById.run(req.params.photoId, req.params.id);

  try { fs.unlinkSync(photo.file_path); } catch { /* file may already be gone */ }

  res.json({ success: true });
});

export default router;
