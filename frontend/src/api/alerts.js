import api from './axios';

export const alertsApi = {
  getAlerts: (params) => api.get('/alerts', { params }),
  resolveAlert: (id) => api.put(`/alerts/${id}/resolve`),
  deleteAlert: (id) => api.delete(`/alerts/${id}`),
  deleteResolvedAll: () => api.delete('/alerts/resolved/all'),
  getConfigs: () => api.get('/alerts/config'),
  createConfig: (data) => api.post('/alerts/config', data),
  updateConfig: (id, data) => api.put(`/alerts/config/${id}`, data),
  deleteConfig: (id) => api.delete(`/alerts/config/${id}`),
};
