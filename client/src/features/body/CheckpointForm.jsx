import { useState, useRef, useEffect } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import NumberStepper from '../../components/ui/NumberStepper.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  useCreateCheckpoint,
  useUpdateCheckpoint,
  useDeleteCheckpoint,
  useUploadPhoto,
  useDeletePhoto,
} from '../../api/hooks/useBody.js';
import { toInputDate } from '../../utils/format.js';
import './body.css';

const PHOTO_SLOTS = [
  { key: 'front', label: 'Спереди' },
  { key: 'back', label: 'Сзади' },
  { key: 'side_left', label: 'Сбоку (лев)' },
  { key: 'side_right', label: 'Сбоку (прав)' },
];

const MEASUREMENTS = [
  { key: 'weight', label: 'Вес (кг)', step: 0.1, min: 20, max: 300 },
  { key: 'chest', label: 'Грудь (см)', step: 0.5, min: 40, max: 200 },
  { key: 'waist', label: 'Талия (см)', step: 0.5, min: 40, max: 200 },
  { key: 'bicep', label: 'Бицепс (см)', step: 0.5, min: 15, max: 80 },
  { key: 'hips', label: 'Бёдра (см)', step: 0.5, min: 40, max: 200 },
  { key: 'neck', label: 'Шея (см)', step: 0.5, min: 20, max: 70 },
  { key: 'calf', label: 'Икры (см)', step: 0.5, min: 15, max: 80 },
];

function getInitial(checkpoint) {
  return {
    date: toInputDate(checkpoint?.date),
    weight: checkpoint?.weight ?? 0,
    chest: checkpoint?.chest ?? 0,
    waist: checkpoint?.waist ?? 0,
    bicep: checkpoint?.bicep ?? 0,
    hips: checkpoint?.hips ?? 0,
    neck: checkpoint?.neck ?? 0,
    calf: checkpoint?.calf ?? 0,
    notes: checkpoint?.notes ?? '',
  };
}

function PhotoSlot({ slot, preview, existingUrl, onSelect, onRemove }) {
  const inputRef = useRef(null);

  const src = preview || existingUrl;

  return (
    <div className="photo-slot">
      <span className="photo-slot__label">{slot.label}</span>
      <div
        className="photo-slot__area"
        onClick={() => !src && inputRef.current?.click()}
      >
        {src ? (
          <>
            <img className="photo-slot__preview" src={src} alt={slot.label} />
            <button
              type="button"
              className="photo-slot__remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Удалить фото"
            >
              ×
            </button>
          </>
        ) : (
          <span>📷</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export default function CheckpointForm({ isOpen, onClose, checkpoint }) {
  const isEdit = !!checkpoint?.id;
  const createMut = useCreateCheckpoint();
  const updateMut = useUpdateCheckpoint();
  const deleteMut = useDeleteCheckpoint();
  const uploadMut = useUploadPhoto();
  const deletePhotoMut = useDeletePhoto();

  const [form, setForm] = useState(() => getInitial(checkpoint));
  const [newPhotos, setNewPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(getInitial(checkpoint));
      setNewPhotos({});
      setPreviews({});
      setRemovedPhotoIds([]);
      setConfirmDelete(false);
    }
  }, [isOpen, checkpoint]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const existingPhotos = (checkpoint?.photos || []).filter(
    (p) => !removedPhotoIds.includes(p.id),
  );

  const getExistingUrl = (type) => {
    const photo = existingPhotos.find((p) => p.photo_type === type);
    return photo ? `/api/uploads/${photo.filename}` : null;
  };

  const handlePhotoSelect = (type, file) => {
    setNewPhotos((p) => ({ ...p, [type]: file }));
    setPreviews((p) => ({ ...p, [type]: URL.createObjectURL(file) }));
  };

  const handlePhotoRemove = (type) => {
    const existing = existingPhotos.find((p) => p.photo_type === type);
    if (existing) {
      setRemovedPhotoIds((ids) => [...ids, existing.id]);
    }
    setNewPhotos((p) => {
      const next = { ...p };
      delete next[type];
      return next;
    });
    setPreviews((p) => {
      if (p[type]) URL.revokeObjectURL(p[type]);
      const next = { ...p };
      delete next[type];
      return next;
    });
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  const handleSubmit = async () => {
    const payload = { ...form };
    MEASUREMENTS.forEach((m) => {
      if (payload[m.key] === 0) payload[m.key] = null;
    });

    let savedId = checkpoint?.id;

    if (isEdit) {
      await updateMut.mutateAsync({ id: savedId, ...payload });
    } else {
      const result = await createMut.mutateAsync(payload);
      savedId = result.id;
    }

    for (const photoId of removedPhotoIds) {
      await deletePhotoMut.mutateAsync({
        checkpointId: savedId,
        photoId,
      });
    }

    for (const [photoType, file] of Object.entries(newPhotos)) {
      await uploadMut.mutateAsync({
        checkpointId: savedId,
        file,
        photoType,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteMut.mutateAsync(checkpoint.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Редактировать замер' : 'Новый замер'}
    >
      <div className="checkpoint-form">
        <div className="checkpoint-form__row">
          <label className="checkpoint-form__date-label">Дата</label>
          <input
            type="date"
            className="checkpoint-form__date-input"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
          />
        </div>

        {MEASUREMENTS.map((m) => (
          <NumberStepper
            key={m.key}
            label={m.label}
            value={form[m.key]}
            onChange={(v) => setField(m.key, v)}
            step={m.step}
            min={0}
          />
        ))}

        <Input
          label="Заметки"
          type="textarea"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Любые заметки…"
        />

        <div className="checkpoint-form__section-title">Фото</div>
        <div className="checkpoint-form__photos">
          {PHOTO_SLOTS.map((slot) => (
            <PhotoSlot
              key={slot.key}
              slot={slot}
              preview={previews[slot.key]}
              existingUrl={getExistingUrl(slot.key)}
              onSelect={(file) => handlePhotoSelect(slot.key, file)}
              onRemove={() => handlePhotoRemove(slot.key)}
            />
          ))}
        </div>

        <div className="checkpoint-form__actions">
          {isEdit && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {confirmDelete ? 'Точно удалить?' : '🗑 Удалить'}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение…' : '✓ Сохранить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
