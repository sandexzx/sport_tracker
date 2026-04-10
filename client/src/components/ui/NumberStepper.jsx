import { useState, useEffect } from 'react';
import './ui.css';

export default function NumberStepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  label,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const clamp = (v) => {
    let n = Number(v);
    if (Number.isNaN(n)) return value;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  };

  const decrement = () => onChange(clamp(value - step));
  const increment = () => onChange(clamp(value + step));

  const commitEdit = () => {
    setEditing(false);
    onChange(clamp(draft));
  };

  return (
    <div className="stepper">
      {label && <span className="stepper__label">{label}</span>}
      <div className="stepper__controls">
        <button
          type="button"
          className="stepper__btn"
          onClick={decrement}
          disabled={min !== undefined && value <= min}
          aria-label="Уменьшить"
        >
          −
        </button>
        {editing ? (
          <input
            className="stepper__input"
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="stepper__value"
            onClick={() => setEditing(true)}
            aria-label="Редактировать значение"
          >
            {value}
          </button>
        )}
        <button
          type="button"
          className="stepper__btn"
          onClick={increment}
          disabled={max !== undefined && value >= max}
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  );
}
