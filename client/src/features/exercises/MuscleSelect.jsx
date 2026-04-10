import { MUSCLES } from './muscles.js';
import './exercises.css';

export default function MuscleSelect({ value, onChange, mode = 'single', exclude = [] }) {
  const available = MUSCLES.filter((m) => !exclude.includes(m));

  const isSelected = (muscle) => {
    if (mode === 'single') return value === muscle;
    return Array.isArray(value) && value.includes(muscle);
  };

  const handleClick = (muscle) => {
    if (mode === 'single') {
      onChange(value === muscle ? '' : muscle);
    } else {
      const arr = Array.isArray(value) ? value : [];
      onChange(
        arr.includes(muscle)
          ? arr.filter((m) => m !== muscle)
          : [...arr, muscle],
      );
    }
  };

  const chipClass = (muscle) => {
    if (!isSelected(muscle)) return 'muscle-chip';
    return mode === 'single'
      ? 'muscle-chip muscle-chip--primary'
      : 'muscle-chip muscle-chip--secondary';
  };

  return (
    <div className="muscle-chips">
      {available.map((muscle) => (
        <button
          key={muscle}
          type="button"
          className={chipClass(muscle)}
          onClick={() => handleClick(muscle)}
        >
          {muscle}
        </button>
      ))}
    </div>
  );
}
