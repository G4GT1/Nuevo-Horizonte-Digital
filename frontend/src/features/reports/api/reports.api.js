import api from '@shared/api/axios';

/** Endpoints de generacion y exportacion de informes. */
export const reportsApi = {
  /**
   * Obtiene los datos agregados de una estacion para el periodo indicado.
   * @param {{ stationId: string, source: string, from: string, to: string }} params
   */
  getReportData: (params) => api.get('/reports/data', { params }),

  /**
   * Exporta el informe como archivo Excel (respuesta blob).
   * @param {{ stationId: string, source: string, from: string, to: string }} params
   */
  exportExcel: (params) => api.get('/reports/export/excel', { params, responseType: 'blob' }),

  /** Dispara el envio inmediato del resumen semanal por email (modo demo). */
  sendWeeklyNow: () => api.post('/reports/weekly/send-now'),
};
