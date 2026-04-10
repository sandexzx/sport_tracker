import MuscleBody from './MuscleBody.jsx';
import Badge from '../../components/ui/Badge.jsx';
import './muscle-map.css';

/**
 * Shows which muscles an exercise targets.
 * @param {{ muscles: Array<{ name: string, role: 'primary'|'secondary' }> }} exercise
 */
export default function ExerciseMuscleMap({ exercise }) {
  if (!exercise?.muscles?.length) return null;

  const primary = exercise.muscles.filter((m) => m.role === 'primary');
  const secondary = exercise.muscles.filter((m) => m.role === 'secondary');

  const highlights = {};
  for (const m of primary) {
    highlights[m.name] = { color: 'var(--terra)', opacity: 1 };
  }
  for (const m of secondary) {
    highlights[m.name] = { color: 'var(--terra-light)', opacity: 0.4 };
  }

  return (
    <div className="exercise-muscle-map">
      <MuscleBody view="front" highlights={highlights} />

      <div className="exercise-muscle-map__labels">
        {primary.length > 0 && (
          <div className="exercise-muscle-map__group">
            <span className="exercise-muscle-map__heading">Основные</span>
            <div className="exercise-muscle-map__badges">
              {primary.map((m) => (
                <Badge key={m.name} variant="partial">{m.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {secondary.length > 0 && (
          <div className="exercise-muscle-map__group">
            <span className="exercise-muscle-map__heading">Вспомогательные</span>
            <div className="exercise-muscle-map__badges">
              {secondary.map((m) => (
                <Badge key={m.name} variant="neutral">{m.name}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
