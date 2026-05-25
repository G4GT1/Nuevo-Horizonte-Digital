import api from '@shared/api/axios';

/** Endpoints de administracion de usuarios, invitaciones y actividad. */
export const adminApi = {
  /**
   * Lista usuarios con paginacion, busqueda y filtro de rol.
   * @param {{ page?: number, limit?: number, search?: string, role?: string }} [params]
   */
  getUsers: (params) => api.get('/admin/users', { params }),

  /**
   * Obtiene los datos de un usuario por ID.
   * @param {string} id
   */
  getUser: (id) => api.get(`/admin/users/${id}`),

  /**
   * Crea un usuario directamente (sin invitacion).
   * @param {Object} data
   */
  createUser: (data) => api.post('/admin/users', data),

  /**
   * Actualiza los datos de un usuario.
   * @param {string} id
   * @param {{ nombre?: string, apellidos?: string, email?: string }} data
   */
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),

  /**
   * Elimina un usuario permanentemente.
   * @param {string} id
   */
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  /**
   * Cambia el rol de un usuario.
   * @param {string} id
   * @param {'superadmin'|'tecnico'|'alumnado'} role
   */
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),

  /**
   * Suspende la cuenta de un usuario (bloquea el acceso).
   * @param {string} id
   */
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),

  /**
   * Reactiva una cuenta previamente suspendida.
   * @param {string} id
   */
  reactivateUser: (id) => api.put(`/admin/users/${id}/reactivate`),

  /**
   * Envia una invitacion por email a un nuevo usuario.
   * @param {{ email: string, role: string }} data
   */
  sendInvitation: (data) => api.post('/admin/invitations', data),

  /** Obtiene todas las invitaciones enviadas. */
  getInvitations: () => api.get('/admin/invitations'),

  /**
   * Elimina una invitacion pendiente.
   * @param {string} id
   */
  deleteInvitation: (id) => api.delete(`/admin/invitations/${id}`),

  /**
   * Obtiene el registro de actividad con paginacion y filtros.
   * @param {{ page?: number, limit?: number, userId?: string }} [params]
   */
  getActivity: (params) => api.get('/activity', { params }),

  /** Ejecuta la comprobacion de alertas de forma manual (superadmin). */
  runAlertsNow: () => api.post('/admin/alerts/run-now'),

  /** Envia un email de alerta critica de prueba al superadmin. */
  demoAlertEmail: () => api.post('/admin/demo/alert-email'),

  /** Envia un email de suspension de cuenta de prueba al superadmin. */
  demoSuspendEmail: () => api.post('/admin/demo/suspend-email'),
};
