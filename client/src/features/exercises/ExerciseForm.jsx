import { useState } from 'react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import NumberStepper from '../../components/ui/NumberStepper.jsx';
import Modal from '../../components/ui/Modal.jsx';
import MuscleSelect from './MuscleSelect.jsx';
import { FITNESS_EMOJIS } from './muscles.js';
import {
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
} from '../../api/hooks/useExercises.js';
import './exercises.css';

export default function ExerciseForm({ exercise, onClose }) {
  const isEdit = !!exercise;

  const [name, setName] = useState(exercise?.name ?? '');
  const [emoji, setEmoji] = useState(exercise?.emoji ?? '🏋️');
  const [primary, setPrimary] = useState(
    () => exercise?.muscles?.find((m) => m.is_primary)?.name ?? '',
  );
  const [secondary, setSecondary] = useState(
    () => exercise?.muscles?.filter((m) => !m.is_primary).map((m) => m.name) ?? [],
  );
  const [notes, setNotes] = useState(exercise?.technique_notes ?? '');
  const [rest, setRest] = useState(exercise?.rest_timer_seconds ?? 90);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createMut = useCreateExercise();
  const updateMut = useUpdateExercise();
  const deleteMut = useDeleteExercise();

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Введите название';
    if (!primary) e.primary = 'Выберите основную мышцу';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    name: name.trim(),
    emoji,
    muscles: [
      { name: primary, is_primary: true },
      ...secondary.map((m) => ({ name: m, is_primary: false })),
    ],
    technique_notes: notes.trim() || null,
    rest_timer_seconds: rest || null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload();
    const mutation = isEdit ? updateMut : createMut;
    const data = isEdit ? { id: exercise.id, ...payload } : payload;

    mutation.mutate(data, { onSuccess: onClose });
  };

  const handleDelete = () => {
    deleteMut.mutate(exercise.id, { onSuccess: onClose });
  };

  return (
    <>
      <form className="exercise-form" onSubmit={handleSubmit}>
        {/* Emoji */}
        <div className="exercise-form__section">
          <span className="exercise-form__label">Иконка</span>
          <div className="emoji-selector">
            <div className="emoji-selector__current">{emoji}</div>
            <div className="emoji-grid">
              {FITNESS_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-grid__item${emoji === e ? ' emoji-grid__item--active' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Жим лёжа"
          error={errors.name}
        />

        {/* Primary muscle */}
        <div className="exercise-form__section">
          <span className="exercise-form__label">Основная мышца</span>
          <MuscleSelect value={primary} onChange={setPrimary} mode="single" />
          {errors.primary && (
            <span className="input-group__error">{errors.primary}</span>
          )}
        </div>

        {/* Secondary muscles */}
        <div className="exercise-form__section">
          <span className="exercise-form__label">Дополнительные мышцы</span>
          <MuscleSelect
            value={secondary}
            onChange={setSecondary}
            mode="multi"
            exclude={primary ? [primary] : []}
          />
        </div>

        {/* Technique notes */}
        <Input
          label="Заметки по технике"
          type="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Локти под 45°, лопатки сведены..."
        />

        {/* Rest timer */}
        <NumberStepper
          label="Таймер отдыха (сек)"
          value={rest}
          onChange={setRest}
          step={15}
          min={0}
          max={600}
        />

        {/* Actions */}
        <div className="exercise-form__actions">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </div>

        {/* Delete */}
        {isEdit && (
          <div className="exercise-form__delete">
            <button
              type="button"
              className="exercise-form__delete-btn"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              Удалить упражнение
            </button>
          </div>
        )}
      </form>

      {/* Delete confirmation */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить упражнение?"
      >
        <div className="confirm-delete">
          <p className="confirm-delete__text">
            «{exercise?.name}» будет удалено. Это действие нельзя отменить.
          </p>
          <div className="confirm-delete__actions">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
