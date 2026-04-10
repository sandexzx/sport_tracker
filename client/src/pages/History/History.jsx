import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts } from '../../api/hooks/useWorkouts.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDate, formatDuration, formatVolume, formatMonth } from '../../utils/format.js';

function workoutStats(workout) {
  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;
  let exerciseCount = 0;

  if (workout.exercises) {
    exerciseCount = workout.exercises.length;
    for (const ex of workout.exercises) {
      if (!ex.sets) continue;
      for (const s of ex.sets) {
        totalSets++;
        if (s.completed) {
          completedSets++;
          totalVolume += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
  }

  return { totalVolume, completedSets, totalSets, exerciseCount };
}

function groupByMonth(workouts) {
  const groups = [];
  const map = new Map();

  for (const w of workouts) {
    const key = formatMonth(w.started_at || w.created_at);
    if (!map.has(key)) {
      const group = { label: key, items: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).items.push(w);
  }

  return groups;
}

function WorkoutCard({ workout, onClick }) {
  const { totalVolume, completedSets, totalSets, exerciseCount } = workoutStats(workout);
  const dateStr = workout.started_at || workout.created_at;
  const duration = formatDuration(workout.started_at, workout.finished_at);

  return (
    <Card onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
            {workout.template_name || 'Свободная тренировка'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            {formatDate(dateStr)}
          </div>
        </div>
        <Badge variant={completedSets === totalSets ? 'complete' : 'partial'}>
          {completedSets}/{totalSets}
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text2)' }}>
        <span>{exerciseCount} упражнени{exerciseCount === 1 ? 'е' : exerciseCount < 5 ? 'я' : 'й'}</span>
        <span>·</span>
        <span>{formatVolume(totalVolume)}</span>
        {duration && (
          <>
            <span>·</span>
            <span>{duration}</span>
          </>
        )}
      </div>
    </Card>
  );
}

const PAGE_SIZE = 20;

export default function History() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const navigate = useNavigate();

  const { data, isLoading, error } = useWorkouts({
    status: 'completed',
    limit,
  });

  const workouts = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.workouts || data.data || [];
  }, [data]);

  const groups = useMemo(() => groupByMonth(workouts), [workouts]);

  const hasMore = workouts.length >= limit;

  return (
    <div>
      <PageHeader title="История" />

      {isLoading && (
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Загрузка…</p>
      )}

      {error && (
        <p style={{ textAlign: 'center', padding: 40, color: '#d44' }}>Ошибка загрузки</p>
      )}

      {!isLoading && !error && workouts.length === 0 && (
        <EmptyState
          icon="📋"
          title="Пока нет завершённых тренировок"
          description="Завершите первую тренировку, и она появится здесь"
        />
      )}

      {groups.map((group) => (
        <div key={group.label} style={{ marginBottom: 24 }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text2)',
            marginBottom: 12,
          }}>
            {group.label}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.items.map((w) => (
              <WorkoutCard
                key={w.id}
                workout={w}
                onClick={() => navigate(`/history/${w.id}`)}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && !isLoading && (
        <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
          >
            Загрузить ещё
          </Button>
        </div>
      )}
    </div>
  );
}
