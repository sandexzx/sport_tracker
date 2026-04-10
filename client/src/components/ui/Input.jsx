import { useId } from 'react';
import './ui.css';

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  inputMode,
  className = '',
}) {
  const id = useId();
  const isTextarea = type === 'textarea';
  const Tag = isTextarea ? 'textarea' : 'input';

  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
      {label && (
        <label className="input-group__label" htmlFor={id}>
          {label}
        </label>
      )}
      <Tag
        id={id}
        className="input-group__field"
        type={isTextarea ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        rows={isTextarea ? 3 : undefined}
      />
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}
