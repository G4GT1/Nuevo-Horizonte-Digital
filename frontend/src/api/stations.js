import api from './axios';

export const stationsApi = {
  getAll: () => api.get('/stations'),

  // FieldClimate
  getFCStations: () => api.get('/stations/fieldclimate'),
  getFCStation: (id) => api.get(`/stations/fieldclimate/${id}`),
  getFCData: (id) => api.get(`/stations/fieldclimate/${id}/data`),
  getFCHistory: (id, from, to) => api.get(`/stations/fieldclimate/${id}/history`, { params: { from, to } }),

  // Cesens
  getCesensStations: () => api.get('/stations/cesens'),
  getCesensStation: (id) => api.get(`/stations/cesens/${id}`),
  getCesensData: (id) => api.get(`/stations/cesens/${id}/data`),
  getCesensHistory: (id, from, to, metric) =>
    api.get(`/stations/cesens/${id}/history`, { params: { from, to, ...(metric ? { metric } : {}) } }),

  // Métricas disponibles de una estación (para el configurador de umbrales)
  getMetrics: (source, id) => api.get(`/stations/${source}/${id}/metrics`),

  // Metadatos manuales (coordenadas)
  getMeta: (source, id) => api.get(`/stations/${source}/${id}/meta`),
  saveMeta: (source, id, data) => api.patch(`/stations/${source}/${id}/meta`, data),

  // Dashboard KPI
  getActiveSensors: () => api.get('/stations/active-sensors'),

  // Generic
  getStation: (id, source) => api.get(`/stations/${id}`, { params: { source } }),
  getData: (id, source) => api.get(`/stations/${id}/data`, { params: { source } }),
  getHistory: (id, source, from, to) =>
    api.get(`/stations/${id}/history`, { params: { source, from, to } }),
};
