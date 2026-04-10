import { create } from 'zustand';

export const useWorkoutStore = create((set) => ({
  activeWorkout: null,
  isTimerRunning: false,
  timerSeconds: 0,
  expandedExerciseId: null,
  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  startTimer: (seconds) => set({ isTimerRunning: true, timerSeconds: seconds }),
  stopTimer: () => set({ isTimerRunning: false, timerSeconds: 0 }),
  setExpandedExercise: (id) => set({ expandedExerciseId: id }),
}));
