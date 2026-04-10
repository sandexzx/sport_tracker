import { useRef, useCallback } from 'react';
import NumberStepper from '../../components/ui/NumberStepper.jsx';
import Tooltip from '../../components/ui/Tooltip.jsx';
import { useUpdateSet, useCompleteSet } from '../../api/hooks/useWorkouts.js';
import { useWorkoutStore } from '../../stores/workoutStore.js';

const RPE_OPTIONS = ['', '6', '7', '8', '9', '10'];
const RPE_TOOLTIP = 'RPE (Rate of Perceived Exertion) — шкала усилия от 6 до 10. 6 = легко, 10 = максимум.';

export default function SetRow({ set, setIndex, restTimerSeconds }) {
  const updateSet = useUpdateSet();
  const completeSet = useCompleteSet();
  const startTimer = useWorkoutStore((s) => s.startTimer);
  const debounceRef = useRef({});

  const debouncedUpdate = useCallback(
    (field, value) => {
      if (debounceRef.current[field]) clearTimeout(debounceRef.current[field]);
      debounceRef.current[field] = setTimeout(() => {
        updateSet.mutate({ id: set.id, [field]: value });
      }, 300);
    },
    [set.id, updateSet],
  );

  const immediateUpdate = useCallback(
    (field, value) => {
      if (debounceRef.current[field]) clearTimeout(debounceRef.current[field]);
      updateSet.mutate({ id: set.id, [field]: value });
    },
    [set.id, updateSet],
  );

  const handleDone = () => {
    if (set.completed) return;
    completeSet.mutate({ id: set.id });
    if (restTimerSeconds > 0) {
      startTimer(restTimerSeconds);
    }
  };

  const handleWarmupToggle = () => {
    immediateUpdate('is_warmup', set.is_warmup ? 0 : 1);
  };

  const handleRpeChange = (e) => {
    const val = e.target.value;
    immediateUpdate('rpe', val === '' ? null : Number(val));
  };

  const isCompleted = !!set.completed;

  return (
    <div className={`set-row${isCompleted ? ' set-row--completed' : ''}`}>
      <span className="set-row__num">{setIndex + 1}</span>

      <NumberStepper
        value={set.weight ?? 0}
        onChange={(v) => immediateUpdate('weight', v)}
        step={2.5}
        min={0}
      />

      <NumberStepper
        value={set.reps ?? 0}
        onChange={(v) => immediateUpdate('reps', v)}
        step={1}
        min={0}
      />

      <div className="set-row__rpe-group">
        <select
          className="set-row__rpe"
          value={set.rpe ?? ''}
          onChange={handleRpeChange}
          aria-label="RPE"
        >
          {RPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o || '—'}
            </option>
          ))}
        </select>
        {setIndex === 0 && <Tooltip text={RPE_TOOLTIP} />}
      </div>

      <button
        type="button"
        className={`set-row__warmup${set.is_warmup ? ' set-row__warmup--active' : ''}`}
        onClick={handleWarmupToggle}
        aria-label="Разминка"
        title="Разминка"
      >
        Р
      </button>

      <button
        type="button"
        className={`set-row__done${isCompleted ? ' set-row__done--completed' : ''}`}
        onClick={handleDone}
        aria-label={isCompleted ? 'Выполнен' : 'Отметить выполненным'}
      >
        {isCompleted ? '✓' : '○'}
      </button>
    </div>
  );
}
