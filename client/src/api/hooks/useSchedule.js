import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client.js';

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get('/schedule'),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put('/schedule', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });
}
