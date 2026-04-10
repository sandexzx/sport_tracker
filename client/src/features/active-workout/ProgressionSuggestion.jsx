import { useState } from 'react';
import { useProgressionSuggestion } from '../../api/hooks/useWorkouts.js';

export default function ProgressionSuggestion({ exerciseId, sets }) {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useProgressionSuggestion(exerciseId);

  if (dismissed) return null;
  if (!sets || sets.length === 0) return null;

  const allCompleted = sets.every((s) => s.completed);
  const allLowRpe = sets.every((s) => s.rpe != null && s.rpe <= 7);

  if (!allCompleted || !allLowRpe) return null;
  if (!data?.suggest) return null;

  return (
    <div className="progression-suggestion">
      <span className="progression-suggestion__text">
        Все подходы выполнены с RPE ≤ 7. Попробуйте увеличить вес до {data.suggested_weight} кг 💪
      </span>
      <button
        type="button"
        className="progression-suggestion__close"
        onClick={() => setDismissed(true)}
        aria-label="Скрыть"
      >
        ×
      </button>
    </div>
  );
}
