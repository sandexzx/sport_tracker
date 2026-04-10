import Modal from '../../components/ui/Modal.jsx';
import ExerciseList from '../exercises/ExerciseList.jsx';
import { useAddWorkoutExercise } from '../../api/hooks/useWorkouts.js';

export default function ExercisePicker({ isOpen, onClose, workoutId }) {
  const addExercise = useAddWorkoutExercise();

  const handleSelect = (exercise) => {
    addExercise.mutate(
      { workoutId, exercise_id: exercise.id },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить упражнение">
      <div className="exercise-picker">
        <ExerciseList onSelect={handleSelect} />
      </div>
    </Modal>
  );
}
