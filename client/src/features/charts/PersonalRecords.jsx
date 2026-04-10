import { usePersonalRecords } from '../../api/hooks/useAnalytics.js';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import './charts.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function groupByExercise(records) {
  const map = {};
  for (const r of records) {
    const key = r.exercise_id || r.exerciseId;
    if (!map[key]) {
      map[key] = {
        name: r.exercise_name || r.exerciseName || 'Упражнение',
        emoji: r.emoji || '',
        records: [],
      };
    }
    map[key].records.push(r);
  }
  return Object.values(map);
}

export default function PersonalRecords() {
  const { data: records = [], isLoading } = usePersonalRecords();

  if (isLoading) return <EmptyState icon="⏳" title="Загрузка..." />;
  if (records.length === 0) return <EmptyState icon="🏆" title="Нет рекордов" description="Начните тренироваться, чтобы увидеть личные рекорды" />;

  const groups = groupByExercise(records);

  return (
    <div className="personal-records">
      <h3 className="personal-records__title">🏆 Личные рекорды</h3>
      {groups.map((group) => {
        const best = {};
        for (const r of group.records) {
          if (r.max_weight != null && (!best.weight || r.max_weight > best.weight.value)) {
            best.weight = { value: r.max_weight, date: r.date };
          }
          if (r.estimated_1rm != null && (!best.orm || r.estimated_1rm > best.orm.value)) {
            best.orm = { value: r.estimated_1rm, date: r.date };
          }
          if (r.total_volume != null && (!best.volume || r.total_volume > best.volume.value)) {
            best.volume = { value: r.total_volume, date: r.date };
          }
          if (r.best_weight != null && !best.weight) {
            best.weight = { value: r.best_weight, date: r.best_weight_date || r.date };
          }
          if (r.best_1rm != null && !best.orm) {
            best.orm = { value: r.best_1rm, date: r.best_1rm_date || r.date };
          }
          if (r.best_volume != null && !best.volume) {
            best.volume = { value: r.best_volume, date: r.best_volume_date || r.date };
          }
        }

        return (
          <Card key={group.name}>
            <div className="pr-card__header">
              {group.emoji ? `${group.emoji} ` : ''}{group.name}
            </div>
            <div className="pr-card__list">
              {best.weight && (
                <div className="pr-card__row">
                  <span>Лучший вес</span>
                  <span>
                    <span className="pr-card__value">{Math.round(best.weight.value)}кг</span>
                    <span className="pr-card__date">({formatDate(best.weight.date)})</span>
                  </span>
                </div>
              )}
              {best.orm && (
                <div className="pr-card__row">
                  <span>Лучший 1RM</span>
                  <span>
                    <span className="pr-card__value">{Math.round(best.orm.value)}кг</span>
                    <span className="pr-card__date">({formatDate(best.orm.date)})</span>
                  </span>
                </div>
              )}
              {best.volume && (
                <div className="pr-card__row">
                  <span>Лучший объём</span>
                  <span>
                    <span className="pr-card__value">{Math.round(best.volume.value)}кг</span>
                    <span className="pr-card__date">({formatDate(best.volume.date)})</span>
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
