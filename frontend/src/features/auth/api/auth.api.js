import api from '@shared/api/axios';

/** Endpoints de autenticacion y gestion de cuenta. */
export const authApi = {
  /**
   * Inicia sesion con email y contrasena.
   * @param {{ email: string, password: string }} data
   */
  login: (data) => api.post('/auth/login', data),

  /**
   * Registra un nuevo usuario.
   * @param {{ nombre: string, apellidos: string, email: string, password: string }} data
   */
  register: (data) => api.post('/auth/register', data),

  /** Cierra la sesion e invalida el refresh token en el servidor. */
  logout: () => api.post('/auth/logout'),

  /** Solicita un nuevo access token usando la cookie de refresh token. */
  refreshToken: () => api.post('/auth/refresh-token'),

  /**
   * Envia un email de recuperacion de contrasena.
   * @param {string} email
   */
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  /**
   * Restablece la contrasena con el token del email de recuperacion.
   * @param {{ token: string, password: string }} data
   */
  resetPassword: (data) => api.post('/auth/reset-password', data),

  /**
   * Verifica el email del usuario con el token del enlace de activacion.
   * @param {string} token
   */
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),

  /**
   * Valida que una invitacion sea correcta y no haya expirado.
   * @param {string} token
   */
  validateInvite: (token) => api.get(`/auth/invite/${token}`),

  /**
   * Acepta una invitacion y crea la cuenta del nuevo usuario.
   * @param {{ token: string, nombre: string, apellidos: string, password: string }} data
   */
  acceptInvite: (data) => api.post('/auth/invite/accept', data),

  /**
   * Reenvía el email de verificacion de cuenta.
   * @param {string} email
   */
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),

  /**
   * Actualiza el perfil del usuario autenticado (nombre y apellidos).
   * @param {{ nombre: string, apellidos: string }} data
   */
  updateProfile: (data) => api.put('/auth/profile', data),

  /**
   * Cambia la contrasena del usuario autenticado.
   * @param {{ currentPassword: string, newPassword: string }} data
   */
  changePassword: (data) => api.put('/auth/change-password', data),
};
