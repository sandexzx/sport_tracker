import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client.js';
import { queryClient } from '../queryClient.js';

function updateSetInWorkout(workout, setId, updates) {
  const clone = JSON.parse(JSON.stringify(workout));
  if (!clone.exercises) return clone;
  for (const ex of clone.exercises) {
    if (!ex.sets) continue;
    const idx = ex.sets.findIndex((s) => s.id === setId);
    if (idx !== -1) {
      ex.sets[idx] = { ...ex.sets[idx], ...updates };
      break;
    }
  }
  return clone;
}

export function useWorkouts(options) {
  return useQuery({
    queryKey: ['workouts', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const qs = params.toString();
      return api.get(`/workouts${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useWorkout(id) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: () => api.get(`/workouts/${id}`),
    enabled: !!id,
  });
}

export function useActiveWorkout() {
  return useQuery({
    queryKey: ['active-workout'],
    queryFn: () => api.get('/active-workout'),
  });
}

export function useStartWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/workouts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-workout'] });
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/workouts/${id}`, { status: 'completed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-workout'] });
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useAbandonWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/workouts/${id}`, { status: 'abandoned' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-workout'] });
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useRepeatWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/workouts/${id}/repeat`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-workout'] });
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useAddWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, ...data }) =>
      api.post(`/workouts/${workoutId}/exercises`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-workout'] }),
  });
}

export function useRemoveWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, exerciseId }) =>
      api.del(`/workouts/${workoutId}/exercises/${exerciseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-workout'] }),
  });
}

export function useReorderWorkoutExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, ...data }) =>
      api.put(`/workouts/${workoutId}/exercises/reorder`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-workout'] }),
  });
}

export function usePreviousPerformance(exerciseId) {
  return useQuery({
    queryKey: ['previous-performance', exerciseId],
    queryFn: () => api.get(`/workouts/previous/${exerciseId}`),
    enabled: !!exerciseId,
  });
}

export function useProgressionSuggestion(exerciseId) {
  return useQuery({
    queryKey: ['progression', exerciseId],
    queryFn: () => api.get(`/workouts/suggest-progression/${exerciseId}`),
    enabled: !!exerciseId,
  });
}

// --- Set mutations ---

export function useAddSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, ...data }) =>
      api.post(`/workout-exercises/${workoutExerciseId}/sets`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-workout'] }),
  });
}

export function useUpdateSet() {
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/sets/${id}`, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['active-workout'] });
      const previous = queryClient.getQueryData(['active-workout']);
      queryClient.setQueryData(['active-workout'], (old) => {
        if (!old) return old;
        return updateSetInWorkout(old, variables.id, variables);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['active-workout'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['active-workout'] });
    },
  });
}

export function useCompleteSet() {
  return useMutation({
    mutationFn: ({ id }) => api.patch(`/sets/${id}/complete`),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['active-workout'] });
      const previous = queryClient.getQueryData(['active-workout']);
      queryClient.setQueryData(['active-workout'], (old) => {
        if (!old) return old;
        return updateSetInWorkout(old, variables.id, { completed: true });
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['active-workout'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['active-workout'] });
    },
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/sets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-workout'] }),
  });
}
