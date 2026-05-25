import api from '@shared/api/axios';

/** Endpoints de estaciones meteorologicas (FieldClimate y Cesens). */
export const stationsApi = {
  /** Obtiene todas las estaciones de ambas fuentes en una sola peticion. */
  getAll: () => api.get('/stations'),

  // ── FieldClimate ──────────────────────────────────────────────────────────

  /** Lista todas las estaciones FieldClimate. */
  getFCStations: () => api.get('/stations/fieldclimate'),

  /**
   * Obtiene los datos de una estacion FieldClimate.
   * @param {string} id - ID original de la estacion (name.original).
   */
  getFCStation: (id) => api.get(`/stations/fieldclimate/${id}`),

  /**
   * Obtiene la lectura en tiempo real de una estacion FieldClimate.
   * @param {string} id
   */
  getFCData: (id) => api.get(`/stations/fieldclimate/${id}/data`),

  /**
   * Obtiene el historico de una estacion FieldClimate en un rango de fechas.
   * @param {string} id
   * @param {string} from - Fecha inicio (yyyy-MM-dd).
   * @param {string} to - Fecha fin (yyyy-MM-dd).
   */
  getFCHistory: (id, from, to) => api.get(`/stations/fieldclimate/${id}/history`, { params: { from, to } }),

  // ── Cesens ────────────────────────────────────────────────────────────────

  /** Lista todas las estaciones Cesens. */
  getCesensStations: () => api.get('/stations/cesens'),

  /**
   * Obtiene los datos de una estacion Cesens.
   * @param {string|number} id
   */
  getCesensStation: (id) => api.get(`/stations/cesens/${id}`),

  /**
   * Obtiene la lectura en tiempo real de una estacion Cesens.
   * @param {string|number} id
   */
  getCesensData: (id) => api.get(`/stations/cesens/${id}/data`),

  /**
   * Obtiene el historico de una estacion Cesens.
   * @param {string|number} id
   * @param {string} from
   * @param {string} to
   * @param {string} [metric] - Filtra por metrica especifica si se indica.
   */
  getCesensHistory: (id, from, to, metric) =>
    api.get(`/stations/cesens/${id}/history`, { params: { from, to, ...(metric ? { metric } : {}) } }),

  // ── Metricas disponibles (para el configurador de umbrales) ───────────────

  /**
   * Devuelve las metricas disponibles de una estacion (usadas en ConfigModal).
   * @param {'fieldclimate'|'cesens'} source
   * @param {string} id
   */
  getMetrics: (source, id) => api.get(`/stations/${source}/${id}/metrics`),

  // ── Metadatos manuales (coordenadas de mapa) ──────────────────────────────

  /**
   * Obtiene los metadatos manuales guardados para una estacion.
   * @param {'fieldclimate'|'cesens'} source
   * @param {string} id
   */
  getMeta: (source, id) => api.get(`/stations/${source}/${id}/meta`),

  /**
   * Guarda o actualiza coordenadas manuales de una estacion.
   * @param {'fieldclimate'|'cesens'} source
   * @param {string} id
   * @param {{ lat: number, lon: number }} data
   */
  saveMeta: (source, id, data) => api.patch(`/stations/${source}/${id}/meta`, data),

  // ── Dashboard KPI ─────────────────────────────────────────────────────────

  /** Obtiene el conteo de sensores activos para el KPI del dashboard. */
  getActiveSensors: () => api.get('/stations/active-sensors'),

  // ── Genericos ─────────────────────────────────────────────────────────────

  /**
   * @param {string} id
   * @param {'fieldclimate'|'cesens'} source
   */
  getStation: (id, source) => api.get(`/stations/${id}`, { params: { source } }),

  /**
   * @param {string} id
   * @param {'fieldclimate'|'cesens'} source
   */
  getData: (id, source) => api.get(`/stations/${id}/data`, { params: { source } }),

  /**
   * @param {string} id
   * @param {'fieldclimate'|'cesens'} source
   * @param {string} from
   * @param {string} to
   */
  getHistory: (id, source, from, to) =>
    api.get(`/stations/${id}/history`, { params: { source, from, to } }),
};
