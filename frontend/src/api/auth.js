import api from './axios';

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),
  validateInvite: (token) => api.get(`/auth/invite/${token}`),
  acceptInvite: (data) => api.post('/auth/invite/accept', data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};
