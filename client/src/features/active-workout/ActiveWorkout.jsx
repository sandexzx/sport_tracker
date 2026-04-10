import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import WorkoutExerciseCard from './WorkoutExerciseCard.jsx';
import ExercisePicker from './ExercisePicker.jsx';
import RestTimer from '../timers/RestTimer.jsx';
import WorkoutTimer from '../timers/WorkoutTimer.jsx';
import { initAudio } from '../timers/sounds.js';
import {
  useActiveWorkout,
  useStartWorkout,
  useFinishWorkout,
  useAbandonWorkout,
} from '../../api/hooks/useWorkouts.js';
import { useTemplates } from '../../api/hooks/useTemplates.js';
import './active-workout.css';

function TemplatePicker({ onSelect, onClose }) {
  const { data: templates = [], isLoading } = useTemplates();

  if (isLoading) {
    return <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Загрузка...</p>;
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Нет шаблонов"
        description="Создайте шаблон тренировки в разделе тренировок"
      />
    );
  }

  return (
    <div className="aw-templates">
      {templates.map((t) => (
        <Card key={t.id} onClick={() => onSelect(t.id)} className="aw-template-card">
          <div className="aw-template-card__name">{t.name}</div>
          {t.exercise_count != null && (
            <div className="aw-template-card__count">{t.exercise_count} упражнений</div>
          )}
        </Card>
      ))}
    </div>
  );
}

function StartOptions() {
  const navigate = useNavigate();
  const startWorkout = useStartWorkout();
  const [showTemplates, setShowTemplates] = useState(false);

  const handleStartFree = () => {
    startWorkout.mutate({});
  };

  const handleSelectTemplate = (templateId) => {
    startWorkout.mutate({ template_id: templateId });
    setShowTemplates(false);
  };

  return (
    <div className="aw-start">
      <EmptyState
        icon="💪"
        title="Начать тренировку"
        description="Выберите способ начать новую тренировку"
      />
      <div className="aw-start__buttons">
        <Button variant="primary" size="lg" onClick={() => setShowTemplates(true)}>
          📋 Начать по шаблону
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleStartFree}
          disabled={startWorkout.isPending}
        >
          🏋️ Свободная тренировка
        </Button>
        <Button variant="ghost" size="lg" onClick={() => navigate('/history')}>
          🔄 Повторить тренировку
        </Button>
      </div>

      <Modal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Выберите шаблон"
      >
        <TemplatePicker
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      </Modal>
    </div>
  );
}

function ActiveWorkoutView({ workout }) {
  const navigate = useNavigate();
  const finishWorkout = useFinishWorkout();
  const abandonWorkout = useAbandonWorkout();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const menuRef = useRef(null);
  const audioInited = useRef(false);

  // Unlock iOS audio on first tap
  useEffect(() => {
    const handler = () => {
      if (!audioInited.current) {
        initAudio();
        audioInited.current = true;
      }
    };
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('click', handler, { once: true });
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
  }, []);

  const exercises = workout.exercises || [];
  const allSets = exercises.flatMap((ex) => ex.sets || []);
  const totalSets = allSets.length;
  const completedSets = allSets.filter((s) => s.completed).length;
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const totalVolume = allSets
    .filter((s) => s.completed && !s.is_warmup)
    .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const handleFinish = () => {
    finishWorkout.mutate(workout.id, {
      onSuccess: () => {
        setShowFinishConfirm(false);
        navigate('/');
      },
    });
  };

  const handleAbandon = () => {
    abandonWorkout.mutate(workout.id, {
      onSuccess: () => {
        setShowAbandonConfirm(false);
        navigate('/');
      },
    });
  };

  const workoutName = workout.template_name || 'Свободная тренировка';

  return (
    <div className="aw">
      {/* Header */}
      <div className="aw__header">
        <div className="aw__header-left">
          <h1 className="aw__title">{workoutName}</h1>
          <div className="aw__meta">
            <span><WorkoutTimer startedAt={workout.started_at} /></span>
            <span>{completedSets}/{totalSets} подходов</span>
          </div>
        </div>
        <div className="aw__menu" ref={menuRef}>
          <button
            className="aw__menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Меню"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="aw__menu-dropdown">
              <button
                className="aw__menu-item aw__menu-item--danger"
                onClick={() => {
                  setShowMenu(false);
                  setShowAbandonConfirm(true);
                }}
              >
                ❌ Отменить тренировку
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="aw__progress">
        <div
          className="aw__progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Exercise cards */}
      {exercises.length === 0 && (
        <EmptyState
          icon="🏋️"
          title="Нет упражнений"
          description="Добавьте первое упражнение к тренировке"
        />
      )}

      {exercises.map((ex) => (
        <WorkoutExerciseCard
          key={ex.workout_exercise_id}
          exercise={ex}
          workoutId={workout.id}
        />
      ))}

      {/* Bottom actions */}
      <div className="aw__bottom">
        <Button variant="secondary" size="md" onClick={() => setShowExercisePicker(true)}>
          + Добавить упражнение
        </Button>

        <button
          className="aw__notes-toggle"
          onClick={() => setShowNotes(!showNotes)}
        >
          📝 {showNotes ? 'Скрыть заметки' : 'Заметки'}
        </button>

        {showNotes && (
          <textarea
            className="aw__notes-area"
            placeholder="Заметки к тренировке..."
            rows={3}
          />
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowFinishConfirm(true)}
          disabled={finishWorkout.isPending}
        >
          ✅ Завершить тренировку
        </Button>
      </div>

      {/* Exercise picker modal */}
      <ExercisePicker
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        workoutId={workout.id}
      />

      {/* Finish confirmation modal */}
      <Modal
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        title="Завершить тренировку?"
      >
        <div className="aw__summary">
          <div className="aw__summary-row">
            <span className="aw__summary-label">Время</span>
            <span className="aw__summary-value"><WorkoutTimer startedAt={workout.started_at} /></span>
          </div>
          <div className="aw__summary-row">
            <span className="aw__summary-label">Упражнений</span>
            <span className="aw__summary-value">{exercises.length}</span>
          </div>
          <div className="aw__summary-row">
            <span className="aw__summary-label">Подходов</span>
            <span className="aw__summary-value">{completedSets}/{totalSets}</span>
          </div>
          <div className="aw__summary-row">
            <span className="aw__summary-label">Объём</span>
            <span className="aw__summary-value">{Math.round(totalVolume).toLocaleString('ru-RU')} кг</span>
          </div>
          <div className="aw__summary-actions">
            <Button variant="ghost" size="md" onClick={() => setShowFinishConfirm(false)}>
              Назад
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleFinish}
              disabled={finishWorkout.isPending}
            >
              Завершить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Abandon confirmation modal */}
      <Modal
        isOpen={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        title="Отменить тренировку?"
      >
        <div className="aw__summary">
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
            Тренировка будет отменена. Это действие нельзя отменить.
          </p>
          <div className="aw__summary-actions">
            <Button variant="ghost" size="md" onClick={() => setShowAbandonConfirm(false)}>
              Назад
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleAbandon}
              disabled={abandonWorkout.isPending}
            >
              Отменить тренировку
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rest timer */}
      <RestTimer />
    </div>
  );
}

export default function ActiveWorkout() {
  const { data: workout, isLoading } = useActiveWorkout();

  if (isLoading) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 48 }}>
        Загрузка...
      </p>
    );
  }

  if (!workout || !workout.id) {
    return <StartOptions />;
  }

  return <ActiveWorkoutView workout={workout} />;
}
