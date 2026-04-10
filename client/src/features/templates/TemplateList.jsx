import { useState } from 'react';
import { useTemplates } from '../../api/hooks/useTemplates.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import TemplateEditor from './TemplateEditor.jsx';
import './templates.css';

export default function TemplateList() {
  const { data: templates = [], isLoading } = useTemplates();
  const [editId, setEditId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const closeModal = () => {
    setEditId(null);
    setShowCreate(false);
  };

  return (
    <div className="template-list">
      <div className="template-list__items">
        {isLoading && (
          <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>
            Загрузка...
          </p>
        )}

        {!isLoading && templates.length === 0 && (
          <EmptyState
            icon="📋"
            title="Нет шаблонов"
            description="Создайте шаблон тренировки с набором упражнений"
            action={{ label: '+ Создать шаблон', onClick: () => setShowCreate(true) }}
          />
        )}

        {templates.map((tpl) => (
          <Card key={tpl.id} onClick={() => setEditId(tpl.id)} className="tpl-card">
            <div className="tpl-card__icon">📋</div>
            <div className="tpl-card__info">
              <div className="tpl-card__name">{tpl.name}</div>
              <div className="tpl-card__meta">
                <Badge variant="neutral">
                  {tpl.exercise_count}{' '}
                  {formatExerciseCount(tpl.exercise_count)}
                </Badge>
                {tpl.description && (
                  <span className="tpl-card__desc">{tpl.description}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        className="template-fab"
        onClick={() => setShowCreate(true)}
        aria-label="Создать шаблон"
      >
        +
      </button>

      <Modal
        isOpen={showCreate}
        onClose={closeModal}
        title="Новый шаблон"
      >
        <TemplateEditor onClose={closeModal} />
      </Modal>

      <Modal
        isOpen={!!editId}
        onClose={closeModal}
        title="Редактировать шаблон"
      >
        {editId && <TemplateEditor templateId={editId} onClose={closeModal} />}
      </Modal>
    </div>
  );
}

function formatExerciseCount(n) {
  if (n === 1) return 'упражнение';
  if (n >= 2 && n <= 4) return 'упражнения';
  return 'упражнений';
}
