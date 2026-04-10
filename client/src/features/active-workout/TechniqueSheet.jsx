import Modal from '../../components/ui/Modal.jsx';
import ExerciseMuscleMap from '../muscle-map/ExerciseMuscleMap.jsx';

export default function TechniqueSheet({ exercise, isOpen, onClose }) {
  if (!exercise) return null;

  const title = `${exercise.emoji || '🏋️'} ${exercise.exercise_name}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {exercise.technique_notes && (
        <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
          {exercise.technique_notes}
        </div>
      )}
      <ExerciseMuscleMap exercise={exercise} />
    </Modal>
  );
}
