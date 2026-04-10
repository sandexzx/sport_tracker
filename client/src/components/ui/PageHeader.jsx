import './ui.css';

export default function PageHeader({ title, showBack = false, onBack }) {
  return (
    <div className="page-header">
      {showBack && (
        <button className="page-header__back" onClick={onBack} aria-label="Назад">
          ← 
        </button>
      )}
      <h1 className="page-header__title">{title}</h1>
    </div>
  );
}
