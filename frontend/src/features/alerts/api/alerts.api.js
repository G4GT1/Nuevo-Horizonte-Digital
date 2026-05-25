import api from '@shared/api/axios';

/** Endpoints de alertas y configuracion de umbrales. */
export const alertsApi = {
  /**
   * Obtiene alertas con filtros opcionales (status, page, limit).
   * @param {{ status?: string, page?: number, limit?: number }} [params]
   */
  getAlerts: (params) => api.get('/alerts', { params }),

  /**
   * Marca una alerta como resuelta.
   * @param {string} id - ID de la alerta.
   */
  resolveAlert: (id) => api.put(`/alerts/${id}/resolve`),

  /**
   * Elimina una alerta por ID.
   * @param {string} id
   */
  deleteAlert: (id) => api.delete(`/alerts/${id}`),

  /** Elimina todas las alertas con estado 'resolved'. */
  deleteResolvedAll: () => api.delete('/alerts/resolved/all'),

  /** Obtiene todas las configuraciones de umbral activas. */
  getConfigs: () => api.get('/alerts/config'),

  /**
   * Crea una nueva configuracion de umbral.
   * @param {{ source: string, stationId: string, metric: string, operator: string, threshold: number }} data
   */
  createConfig: (data) => api.post('/alerts/config', data),

  /**
   * Actualiza una configuracion de umbral existente.
   * @param {string} id
   * @param {Object} data
   */
  updateConfig: (id, data) => api.put(`/alerts/config/${id}`, data),

  /**
   * Elimina una configuracion de umbral.
   * @param {string} id
   */
  deleteConfig: (id) => api.delete(`/alerts/config/${id}`),
};
