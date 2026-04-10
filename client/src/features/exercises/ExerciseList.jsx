import { useState, useDeferredValue } from 'react';
import { useExercises } from '../../api/hooks/useExercises.js';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ExerciseForm from './ExerciseForm.jsx';
import { MUSCLES } from './muscles.js';
import './exercises.css';

export default function ExerciseList({ onSelect }) {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [modalExercise, setModalExercise] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const { data: exercises = [], isLoading } = useExercises({
    search: deferredSearch || undefined,
    muscle: muscle || undefined,
  });

  const handleCardClick = (ex) => {
    if (onSelect) {
      onSelect(ex);
    } else {
      setModalExercise(ex);
    }
  };

  const closeModal = () => {
    setModalExercise(null);
    setShowCreate(false);
  };

  const getPrimary = (ex) => ex.muscles?.find((m) => m.is_primary);
  const getSecondary = (ex) => ex.muscles?.filter((m) => !m.is_primary) ?? [];

  return (
    <div className="exercise-list">
      {/* Filters */}
      <div className="exercise-list__filters">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск упражнений..."
        />
        <div className="exercise-list__muscle-filter">
          {MUSCLES.map((m) => (
            <button
              key={m}
              type="button"
              className={`exercise-list__muscle-btn${muscle === m ? ' exercise-list__muscle-btn--active' : ''}`}
              onClick={() => setMuscle(muscle === m ? '' : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="exercise-list__items">
        {isLoading && (
          <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>
            Загрузка...
          </p>
        )}

        {!isLoading && exercises.length === 0 && (
          <EmptyState
            icon="🏋️"
            title="Нет упражнений"
            description={
              search || muscle
                ? 'Попробуйте изменить фильтры'
                : 'Добавьте первое упражнение'
            }
            action={
              !search && !muscle
                ? { label: '+ Добавить', onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        )}

        {exercises.map((ex) => {
          const primary = getPrimary(ex);
          const secondary = getSecondary(ex);

          return (
            <Card key={ex.id} onClick={() => handleCardClick(ex)} className="ex-card">
              <div className="ex-card__emoji">{ex.emoji || '🏋️'}</div>
              <div className="ex-card__info">
                <div className="ex-card__name">{ex.name}</div>
                <div className="ex-card__meta">
                  {primary && (
                    <Badge variant="complete">{primary.name}</Badge>
                  )}
                  {secondary.length > 0 && (
                    <span className="ex-card__secondary">
                      {secondary.map((m) => m.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              {ex.rest_timer_seconds > 0 && (
                <span className="ex-card__timer">⏱ {ex.rest_timer_seconds}с</span>
              )}
            </Card>
          );
        })}
      </div>

      {/* FAB */}
      <button
        className="exercise-fab"
        onClick={() => setShowCreate(true)}
        aria-label="Добавить упражнение"
      >
        +
      </button>

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onClose={closeModal}
        title="Новое упражнение"
      >
        <ExerciseForm onClose={closeModal} />
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!modalExercise}
        onClose={closeModal}
        title="Редактировать"
      >
        {modalExercise && (
          <ExerciseForm exercise={modalExercise} onClose={closeModal} />
        )}
      </Modal>
    </div>
  );
}
