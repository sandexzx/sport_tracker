import { useState, useCallback } from 'react';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '../../api/hooks/useTemplates.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import NumberStepper from '../../components/ui/NumberStepper.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ExerciseList from '../exercises/ExerciseList.jsx';
import './templates.css';

export default function TemplateEditor({ templateId, onClose }) {
  const isEdit = !!templateId;
  const { data: existing } = useTemplate(templateId);
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();
  const deleteMut = useDeleteTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameError, setNameError] = useState('');

  // Initialize from fetched data
  if (isEdit && existing && !initialized) {
    setName(existing.name || '');
    setDescription(existing.description || '');
    setExercises(
      (existing.exercises || []).map((ex) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        emoji: ex.emoji,
        sort_order: ex.sort_order,
        sets_count: ex.sets_count ?? 3,
        target_reps: ex.target_reps ?? 10,
        target_weight: ex.target_weight ?? 0,
      })),
    );
    setInitialized(true);
  }

  const handleSelectExercise = useCallback((ex) => {
    setExercises((prev) => {
      const exists = prev.some((e) => e.exercise_id === ex.id);
      if (exists) return prev;
      return [
        ...prev,
        {
          exercise_id: ex.id,
          exercise_name: ex.name,
          emoji: ex.emoji || '🏋️',
          sort_order: prev.length,
          sets_count: 3,
          target_reps: 10,
          target_weight: 0,
        },
      ];
    });
    setShowExercisePicker(false);
  }, []);

  const updateExercise = (index, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const moveExercise = (index, direction) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Введите название');
      return;
    }
    setNameError('');

    const payload = {
      name: trimmed,
      description: description.trim(),
      exercises: exercises.map((ex, i) => ({
        exercise_id: ex.exercise_id,
        sort_order: i,
        sets_count: ex.sets_count,
        target_reps: ex.target_reps,
        target_weight: ex.target_weight,
      })),
    };

    const mutation = isEdit ? updateMut : createMut;
    const data = isEdit ? { id: templateId, ...payload } : payload;

    mutation.mutate(data, { onSuccess: onClose });
  };

  const handleDelete = () => {
    deleteMut.mutate(templateId, { onSuccess: onClose });
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="tpl-editor">
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Например: Верхний день"
        error={nameError}
      />

      <Input
        label="Описание"
        type="textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Необязательное описание..."
      />

      <div className="tpl-editor__exercises">
        <span className="tpl-editor__exercises-label">Упражнения</span>

        <div className="tpl-editor__exercise-list">
          {exercises.map((ex, index) => (
            <div key={ex.exercise_id} className="tpl-editor__exercise-item">
              <div className="tpl-editor__exercise-header">
                <span className="tpl-editor__exercise-emoji">{ex.emoji}</span>
                <span className="tpl-editor__exercise-name">{ex.exercise_name}</span>
                <div className="tpl-editor__exercise-actions">
                  <button
                    type="button"
                    className="tpl-editor__exercise-btn"
                    onClick={() => moveExercise(index, -1)}
                    disabled={index === 0}
                    aria-label="Вверх"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="tpl-editor__exercise-btn"
                    onClick={() => moveExercise(index, 1)}
                    disabled={index === exercises.length - 1}
                    aria-label="Вниз"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="tpl-editor__exercise-btn tpl-editor__exercise-btn--remove"
                    onClick={() => removeExercise(index)}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="tpl-editor__exercise-params">
                <NumberStepper
                  label="Подходы"
                  value={ex.sets_count}
                  onChange={(v) => updateExercise(index, 'sets_count', v)}
                  min={1}
                  max={20}
                />
                <NumberStepper
                  label="Повторения"
                  value={ex.target_reps}
                  onChange={(v) => updateExercise(index, 'target_reps', v)}
                  min={1}
                  max={100}
                />
                <NumberStepper
                  label="Вес, кг"
                  value={ex.target_weight}
                  onChange={(v) => updateExercise(index, 'target_weight', v)}
                  min={0}
                  step={2.5}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="tpl-editor__add-btn"
          onClick={() => setShowExercisePicker(true)}
        >
          + Добавить упражнение
        </Button>
      </div>

      <div className="tpl-editor__actions">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      {isEdit && (
        <div className="tpl-editor__delete">
          <button
            type="button"
            className="tpl-editor__delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Удалить шаблон
          </button>
        </div>
      )}

      <Modal
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        title="Выберите упражнение"
      >
        <ExerciseList onSelect={handleSelectExercise} />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Удалить шаблон?"
      >
        <div className="confirm-delete">
          <p className="confirm-delete__text">
            Шаблон «{name}» будет удалён. Это действие нельзя отменить.
          </p>
          <div className="confirm-delete__actions">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
