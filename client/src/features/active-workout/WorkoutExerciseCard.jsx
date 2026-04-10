import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import SetRow from './SetRow.jsx';
import TechniqueSheet from './TechniqueSheet.jsx';
import ProgressionSuggestion from './ProgressionSuggestion.jsx';
import {
  usePreviousPerformance,
  useAddSet,
  useRemoveWorkoutExercise,
} from '../../api/hooks/useWorkouts.js';
import { useWorkoutStore } from '../../stores/workoutStore.js';

function formatPreviousPerformance(sets) {
  if (!sets || sets.length === 0) return null;
  return sets
    .map((s) => {
      let txt = `${s.weight}кг×${s.reps}`;
      if (s.rpe) txt += ` @${s.rpe}`;
      return txt;
    })
    .join(', ');
}

export default function WorkoutExerciseCard({ exercise, workoutId }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [techniqueOpen, setTechniqueOpen] = useState(false);
  const expandedExerciseId = useWorkoutStore((s) => s.expandedExerciseId);
  const setExpandedExercise = useWorkoutStore((s) => s.setExpandedExercise);
  const addSet = useAddSet();
  const removeExercise = useRemoveWorkoutExercise();

  const isExpanded = expandedExerciseId === exercise.workout_exercise_id;
  const { data: prevPerf } = usePreviousPerformance(
    isExpanded ? exercise.exercise_id : null,
  );

  const sets = exercise.sets || [];
  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const allDone = totalSets > 0 && completedSets === totalSets;

  const toggleExpand = () => {
    setExpandedExercise(isExpanded ? null : exercise.workout_exercise_id);
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    addSet.mutate({
      workoutExerciseId: exercise.workout_exercise_id,
      weight: lastSet?.weight ?? 0,
      reps: lastSet?.reps ?? 0,
    });
  };

  const handleRemove = () => {
    removeExercise.mutate({
      workoutId,
      exerciseId: exercise.workout_exercise_id,
    });
    setConfirmRemove(false);
  };

  const prevText = prevPerf?.sets
    ? formatPreviousPerformance(prevPerf.sets)
    : null;

  const hasTechniqueInfo = !!(exercise.technique_notes || exercise.muscles?.length);

  return (
    <Card className="wec">
      <div className="wec__header" onClick={toggleExpand} role="button" tabIndex={0}>
        <span className="wec__emoji">{exercise.emoji || '🏋️'}</span>
        <span className="wec__name">{exercise.exercise_name}</span>
        {hasTechniqueInfo && (
          <button
            type="button"
            className="wec__info-btn"
            onClick={(e) => { e.stopPropagation(); setTechniqueOpen(true); }}
            aria-label="Техника выполнения"
          >
            ℹ️
          </button>
        )}
        <Badge variant={allDone ? 'complete' : completedSets > 0 ? 'partial' : 'neutral'}>
          {completedSets}/{totalSets}
        </Badge>
      </div>

      {isExpanded && (
        <div className="wec__body">
          {prevText && (
            <div className="wec__prev">Прошлый раз: {prevText}</div>
          )}

          {totalSets > 0 && (
            <>
              <div className="wec__sets-header">
                <span>#</span>
                <span>Вес</span>
                <span>Повт</span>
                <span>RPE</span>
                <span></span>
                <span></span>
              </div>
              <div className="wec__sets">
                {sets.map((s, i) => (
                  <SetRow
                    key={s.id}
                    set={s}
                    setIndex={i}
                    restTimerSeconds={exercise.rest_timer_seconds || 0}
                  />
                ))}
              </div>
            </>
          )}

          <div className="wec__actions">
            <Button variant="ghost" size="sm" onClick={handleAddSet} disabled={addSet.isPending}>
              + Добавить подход
            </Button>
            <div style={{ flex: 1 }} />
            {confirmRemove ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                  Отмена
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="aw__menu-item--danger"
                  disabled={removeExercise.isPending}
                >
                  Удалить
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                🗑 Удалить
              </Button>
            )}
          </div>

          <ProgressionSuggestion exerciseId={exercise.exercise_id} sets={sets} />
        </div>
      )}

      <TechniqueSheet
        exercise={exercise}
        isOpen={techniqueOpen}
        onClose={() => setTechniqueOpen(false)}
      />
    </Card>
  );
}
