import api from '@shared/api/axios';

/** Endpoints de notificaciones del usuario autenticado. */
export const notificationsApi = {
  /**
   * Obtiene el listado de notificaciones con paginacion.
   * @param {{ page?: number, limit?: number }} [params]
   */
  getAll: (params) => api.get('/notifications', { params }),

  /**
   * Marca una notificacion como leida.
   * @param {string} id - ID de la notificacion.
   */
  markRead: (id) => api.put(`/notifications/${id}/read`),

  /** Marca todas las notificaciones del usuario como leidas. */
  markAllRead: () => api.put('/notifications/read-all'),

  /**
   * Elimina una notificacion.
   * @param {string} id - ID de la notificacion.
   */
  delete: (id) => api.delete(`/notifications/${id}`),
};
