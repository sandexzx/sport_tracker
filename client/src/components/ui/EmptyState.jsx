import Button from './Button.jsx';
import './ui.css';

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      {title && <h3 className="empty-state__title">{title}</h3>}
      {description && <p className="empty-state__desc">{description}</p>}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
