import api from '@shared/api/axios';

/** Endpoints del asistente de inteligencia artificial. */
export const aiApi = {
  /**
   * Envia el historial de conversacion al chat agronomico general.
   * @param {Array<{role: string, content: string}>} messages - Historial (maximo 10 mensajes).
   */
  chat: (messages) => api.post('/ai/chat', { messages }),

  /**
   * Busqueda semantica sobre datos de estaciones.
   * @param {string} pregunta - Consulta en lenguaje natural.
   */
  search: (pregunta) => api.post('/ai/search', { pregunta }),

  /**
   * Envia el historial al chat de ayuda de la plataforma.
   * @param {Array<{role: string, content: string}>} messages
   */
  help: (messages) => api.post('/ai/help', { messages }),

  /**
   * Envia un ticket de soporte al administrador.
   * @param {{ asunto: string, descripcion: string, urgencia: string }} data
   */
  sendTicket: (data) => api.post('/ai/ticket', data),
};
