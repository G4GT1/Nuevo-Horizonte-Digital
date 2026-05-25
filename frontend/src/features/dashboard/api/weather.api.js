import api from '@shared/api/axios';

/** Endpoints del servicio de prediccion meteorologica. */
export const weatherApi = {
  /** Obtiene la prediccion meteorologica actual (Open-Meteo via backend). */
  getCurrent: () => api.get('/weather'),
};
