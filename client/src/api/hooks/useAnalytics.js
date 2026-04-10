import { useQuery } from '@tanstack/react-query';
import { api } from '../client.js';

const ANALYTICS_STALE = 5 * 60 * 1000;

export function useExerciseProgress(exerciseId, period) {
  return useQuery({
    queryKey: ['analytics', 'exercise', exerciseId, period],
    queryFn: () => {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      const qs = params.toString();
      return api.get(`/analytics/exercise/${exerciseId}${qs ? `?${qs}` : ''}`);
    },
    staleTime: ANALYTICS_STALE,
    enabled: !!exerciseId,
  });
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['analytics', 'records'],
    queryFn: () => api.get('/analytics/records'),
    staleTime: ANALYTICS_STALE,
  });
}

export function useTrainingStats() {
  return useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: () => api.get('/analytics/stats'),
    staleTime: ANALYTICS_STALE,
  });
}

export function useBodyAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'body'],
    queryFn: () => api.get('/analytics/body'),
    staleTime: ANALYTICS_STALE,
  });
}

export function useMuscleLoad() {
  return useQuery({
    queryKey: ['analytics', 'muscle-load'],
    queryFn: () => api.get('/analytics/muscle-load'),
    staleTime: ANALYTICS_STALE,
  });
}
