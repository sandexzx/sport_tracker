import './ui.css';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
