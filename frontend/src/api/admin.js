import api from './axios';

export const adminApi = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
  reactivateUser: (id) => api.put(`/admin/users/${id}/reactivate`),
  sendInvitation: (data) => api.post('/admin/invitations', data),
  getInvitations: () => api.get('/admin/invitations'),
  deleteInvitation: (id) => api.delete(`/admin/invitations/${id}`),
  getActivity: (params) => api.get('/activity', { params }),
  runAlertsNow: () => api.post('/admin/alerts/run-now'),
  demoAlertEmail: () => api.post('/admin/demo/alert-email'),
  demoSuspendEmail: () => api.post('/admin/demo/suspend-email'),
};
