import api from './axios';

export const aiApi = {
  chat:       (messages) => api.post('/ai/chat', { messages }),
  search:     (pregunta) => api.post('/ai/search', { pregunta }),
  help:       (messages) => api.post('/ai/help', { messages }),
  sendTicket: (data)     => api.post('/ai/ticket', data),
};
