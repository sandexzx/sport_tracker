import { useState } from 'react';
import { useSchedule, useUpdateSchedule } from '../../api/hooks/useSchedule.js';
import { useTemplates } from '../../api/hooks/useTemplates.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import './schedule.css';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function ScheduleView() {
  const { data: schedule = [], isLoading } = useSchedule();
  const { data: templates = [] } = useTemplates();
  const updateSchedule = useUpdateSchedule();

  const [pickerDay, setPickerDay] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const getTemplatesForDay = (weekday) => {
    const day = schedule.find((d) => d.weekday === weekday);
    return day?.templates || [];
  };

  const handleAddTemplate = (weekday, templateId) => {
    const current = schedule.map((d) => ({
      weekday: d.weekday,
      template_ids: (d.templates || []).map((t) => t.id),
    }));

    const dayEntry = current.find((d) => d.weekday === weekday);
    if (dayEntry) {
      dayEntry.template_ids.push(templateId);
    } else {
      current.push({ weekday, template_ids: [templateId] });
    }

    const assignments = current.flatMap((d) =>
      d.template_ids.map((tid) => ({ weekday: d.weekday, template_id: tid })),
    );

    updateSchedule.mutate({ assignments });
    setPickerDay(null);
  };

  const handleRemoveTemplate = () => {
    if (!removeTarget) return;
    const { weekday, templateId } = removeTarget;

    const assignments = [];
    for (const day of schedule) {
      const tpls = (day.templates || []).map((t) => t.id);
      const filtered =
        day.weekday === weekday
          ? removeFirst(tpls, templateId)
          : tpls;
      for (const tid of filtered) {
        assignments.push({ weekday: day.weekday, template_id: tid });
      }
    }

    updateSchedule.mutate({ assignments });
    setRemoveTarget(null);
  };

  if (isLoading) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>
        Загрузка...
      </p>
    );
  }

  return (
    <div className="schedule">
      {DAY_NAMES.map((dayName, weekday) => {
        const dayTemplates = getTemplatesForDay(weekday);
        return (
          <div key={weekday} className="schedule__day">
            <span className="schedule__day-label">{dayName}</span>
            <div className="schedule__day-content">
              {dayTemplates.length === 0 && (
                <span className="schedule__empty">Отдых</span>
              )}
              {dayTemplates.map((tpl, idx) => (
                <button
                  key={`${tpl.id}-${idx}`}
                  type="button"
                  className="schedule__template-chip"
                  onClick={() =>
                    setRemoveTarget({ weekday, templateId: tpl.id, name: tpl.name })
                  }
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="schedule__add-btn"
              onClick={() => setPickerDay(weekday)}
              aria-label={`Добавить шаблон на ${dayName}`}
            >
              +
            </button>
          </div>
        );
      })}

      {/* Template picker modal */}
      <Modal
        isOpen={pickerDay !== null}
        onClose={() => setPickerDay(null)}
        title={`Добавить на ${pickerDay !== null ? DAY_NAMES[pickerDay] : ''}`}
      >
        <div className="template-picker">
          {templates.length === 0 && (
            <EmptyState
              icon="📋"
              title="Нет шаблонов"
              description="Сначала создайте шаблон тренировки"
            />
          )}
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="template-picker__item"
              onClick={() => handleAddTemplate(pickerDay, tpl.id)}
            >
              <span className="template-picker__icon">📋</span>
              <span className="template-picker__name">{tpl.name}</span>
              <span className="template-picker__count">
                {tpl.exercise_count} упр.
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Remove confirmation modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Убрать шаблон?"
      >
        {removeTarget && (
          <div className="schedule__confirm">
            <p className="schedule__confirm-text">
              Убрать «{removeTarget.name}» из {DAY_NAMES[removeTarget.weekday]}?
            </p>
            <div className="schedule__confirm-actions">
              <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
                Отмена
              </Button>
              <Button variant="primary" onClick={handleRemoveTemplate}>
                Убрать
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function removeFirst(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) return arr;
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}
