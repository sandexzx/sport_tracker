import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout, useRepeatWorkout } from '../../api/hooks/useWorkouts.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatDate, formatDuration, formatVolume } from '../../utils/format.js';

function computeStats(workout) {
  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;

  if (workout.exercises) {
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

  return { totalVolume, completedSets, totalSets };
}

function SetRow({ set }) {
  const isWarmup = set.is_warmup;
  const weight = set.weight || 0;
  const reps = set.reps || 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 0',
      color: isWarmup ? 'var(--text2)' : 'var(--text)',
    }}>
      <span style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        flexShrink: 0,
        background: set.completed ? 'var(--olive-bg)' : 'var(--cream)',
        color: set.completed ? 'var(--olive)' : 'var(--text2)',
      }}>
        {set.completed ? '✓' : '–'}
      </span>

      <span style={{ fontSize: 14, flex: 1 }}>
        {set.set_number}.{' '}
        {weight > 0 ? `${weight} кг × ${reps}` : `${reps} повторений`}
      </span>

      {isWarmup && <Badge variant="neutral">разм.</Badge>}
      {set.rpe != null && (
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          RPE {set.rpe}
        </span>
      )}
    </div>
  );
}

function ExerciseCard({ exercise }) {
  return (
    <Card>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {exercise.emoji || '🏋️'} {exercise.exercise_name || exercise.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(exercise.sets || []).map((s) => (
          <SetRow key={s.id} set={s} />
        ))}
      </div>
    </Card>
  );
}

export default function WorkoutDetail() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { data: workout, isLoading, error } = useWorkout(workoutId);
  const repeatMutation = useRepeatWorkout();

  if (isLoading) return <p style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Загрузка…</p>;
  if (error) return <p style={{ textAlign: 'center', padding: 40, color: '#d44' }}>Ошибка загрузки</p>;
  if (!workout) return null;

  const { totalVolume, completedSets, totalSets } = computeStats(workout);
  const duration = formatDuration(workout.started_at, workout.finished_at);
  const templateName = workout.template_name || 'Свободная тренировка';

  const handleRepeat = () => {
    repeatMutation.mutate(workout.id, {
      onSuccess: () => navigate('/workout'),
    });
  };

  return (
    <div>
      <PageHeader
        title={templateName}
        showBack
        onBack={() => navigate('/history')}
      />

      <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: -12, marginBottom: 16 }}>
        {formatDate(workout.started_at || workout.created_at)}
      </p>

      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {duration && (
          <Badge variant="neutral">⏱ {duration}</Badge>
        )}
        <Badge variant="neutral">🏋️ {formatVolume(totalVolume)}</Badge>
        <Badge variant={completedSets === totalSets ? 'complete' : 'partial'}>
          ✓ {completedSets}/{totalSets}
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(workout.exercises || []).map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>

      {workout.notes && (
        <Card className="" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Заметки</div>
          <div style={{ fontSize: 14 }}>{workout.notes}</div>
        </Card>
      )}

      <div style={{ marginTop: 24, paddingBottom: 24 }}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleRepeat}
          disabled={repeatMutation.isPending}
          className=""
          style={{ width: '100%' }}
        >
          🔄 Повторить тренировку
        </Button>
      </div>
    </div>
  );
}
