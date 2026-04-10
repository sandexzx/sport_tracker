import { useState } from 'react';
import { useBodyCheckpoints } from '../../api/hooks/useBody.js';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import CheckpointForm from './CheckpointForm.jsx';
import { formatDateLong } from '../../utils/format.js';
import './body.css';

function CheckpointCard({ checkpoint, onEdit }) {
  const { date, weight, waist, chest, photos } = checkpoint;
  const photoCount = photos ? photos.length : 0;

  return (
    <Card onClick={() => onEdit(checkpoint)}>
      <div className="checkpoint-card__date">{formatDateLong(date)}</div>
      <div className="checkpoint-card__metrics">
        {weight != null && (
          <span className="checkpoint-card__metric">
            Вес: <strong>{weight} кг</strong>
          </span>
        )}
        {waist != null && (
          <span className="checkpoint-card__metric">
            Талия: <strong>{waist} см</strong>
          </span>
        )}
        {chest != null && (
          <span className="checkpoint-card__metric">
            Грудь: <strong>{chest} см</strong>
          </span>
        )}
        {photoCount > 0 && (
          <span className="checkpoint-card__photos">
            📷 {photoCount}
          </span>
        )}
      </div>
    </Card>
  );
}

export default function CheckpointList() {
  const { data: checkpoints, isLoading, error } = useBodyCheckpoints();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (cp) => {
    setEditing(cp);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  if (isLoading) {
    return (
      <p style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
        Загрузка…
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: 'center', padding: 40, color: '#d44' }}>
        Ошибка загрузки
      </p>
    );
  }

  const sorted = [...(checkpoints || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  return (
    <>
      {sorted.length === 0 ? (
        <EmptyState
          icon="📏"
          title="Пока нет замеров"
          description="Добавьте первый замер, чтобы отслеживать прогресс тела"
          action={{ label: '+ Добавить замер', onClick: openCreate }}
        />
      ) : (
        <div className="checkpoint-list">
          {sorted.map((cp) => (
            <CheckpointCard key={cp.id} checkpoint={cp} onEdit={openEdit} />
          ))}
        </div>
      )}

      <button className="body-fab" onClick={openCreate} aria-label="Добавить замер">
        +
      </button>

      <CheckpointForm
        isOpen={formOpen}
        onClose={closeForm}
        checkpoint={editing}
      />
    </>
  );
}
