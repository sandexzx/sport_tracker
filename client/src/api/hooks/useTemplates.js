import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client.js';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });
}

export function useTemplate(id) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => api.get(`/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}
