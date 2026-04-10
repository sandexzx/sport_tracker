import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client.js';

export function useExercises(options) {
  return useQuery({
    queryKey: ['exercises', options?.search, options?.muscle],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.search) params.set('search', options.search);
      if (options?.muscle) params.set('muscle', options.muscle);
      const qs = params.toString();
      return api.get(`/exercises${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useExercise(id) {
  return useQuery({
    queryKey: ['exercises', id],
    queryFn: () => api.get(`/exercises/${id}`),
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/exercises', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/exercises/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
