import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client.js';

export function useBodyCheckpoints() {
  return useQuery({
    queryKey: ['body-checkpoints'],
    queryFn: () => api.get('/body'),
  });
}

export function useBodyCheckpoint(id) {
  return useQuery({
    queryKey: ['body-checkpoints', id],
    queryFn: () => api.get(`/body/${id}`),
    enabled: !!id,
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/body', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-checkpoints'] }),
  });
}

export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/body/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-checkpoints'] }),
  });
}

export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/body/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-checkpoints'] }),
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checkpointId, file, photoType }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('photo_type', photoType);
      return api.uploadFile(`/body/${checkpointId}/photos`, formData);
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ['body-checkpoints', variables.checkpointId],
      }),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checkpointId, photoId }) =>
      api.del(`/body/${checkpointId}/photos/${photoId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['body-checkpoints'] }),
  });
}
