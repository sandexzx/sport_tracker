import './ui.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn--${variant} btn--${size} ${className}`}
    >
      {children}
    </button>
  );
}
